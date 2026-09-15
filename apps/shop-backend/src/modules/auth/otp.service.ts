import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  async request(phone: string, clientIp: string) {
    const windowSeconds = this.setting('otp.rateWindowSeconds', 600);
    const ipHash = this.hash(`ip:${clientIp || 'unknown'}`);
    const expiresSeconds = this.setting('otp.expiresSeconds', 120);
    const resendSeconds = this.setting('otp.resendSeconds', 60);
    const issued = await this.issueChallenge(
      phone,
      ipHash,
      windowSeconds,
      expiresSeconds,
      resendSeconds,
    );

    try {
      await this.sms.sendOtp(phone, issued.code);
    } catch (error) {
      await this.prisma.otpChallenge.deleteMany({
        where: { phone, codeHash: issued.codeHash },
      });
      throw error;
    }

    return {
      message: 'کد تأیید ارسال شد',
      expiresIn: expiresSeconds,
      retryAfter: resendSeconds,
    };
  }

  async verify(phone: string, code: string): Promise<void> {
    const challenge = await this.prisma.otpChallenge.findUnique({
      where: { phone },
    });
    const maxAttempts = this.setting('otp.maxAttempts', 5);

    if (!challenge || challenge.expiresAt <= new Date()) {
      if (challenge) {
        await this.prisma.otpChallenge.delete({ where: { phone } });
      }
      throw new BadRequestException(
        'کد تأیید منقضی شده است؛ کد جدید دریافت کنید',
      );
    }
    if (challenge.attempts >= maxAttempts) {
      throw new HttpException(
        'تعداد تلاش‌ها بیش از حد مجاز است؛ کد جدید دریافت کنید',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const receivedHash = this.hash(`otp:${phone}:${code}`);
    const matches = timingSafeEqual(
      Buffer.from(challenge.codeHash, 'hex'),
      Buffer.from(receivedHash, 'hex'),
    );

    if (!matches) {
      await this.prisma.otpChallenge.updateMany({
        where: {
          phone,
          codeHash: challenge.codeHash,
          attempts: { lt: maxAttempts },
        },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('کد تأیید صحیح نیست');
    }

    const consumed = await this.prisma.otpChallenge.deleteMany({
      // A code that expired or exhausted its attempts between the initial read
      // and this atomic consume must not be accepted.
      where: {
        phone,
        codeHash: challenge.codeHash,
        attempts: { lt: maxAttempts },
        expiresAt: { gt: new Date() },
      },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException(
        'این کد قبلاً استفاده شده است؛ کد جدید دریافت کنید',
      );
    }
  }

  private setting(key: string, fallback: number): number {
    return this.config.get<number>(key) ?? fallback;
  }

  private async issueChallenge(
    phone: string,
    ipHash: string,
    windowSeconds: number,
    expiresSeconds: number,
    resendSeconds: number,
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const now = new Date();
            const existing = await tx.otpChallenge.findUnique({
              where: { phone },
            });
            if (existing && existing.resendAfter > now) {
              this.rateLimited(
                'کد قبلی هنوز معتبر است؛ کمی بعد دوباره تلاش کنید',
                Math.ceil(
                  (existing.resendAfter.getTime() - now.getTime()) / 1000,
                ),
              );
            }

            const windowStart = new Date(now.getTime() - windowSeconds * 1000);
            const [phoneRequests, ipRequests] = await Promise.all([
              tx.otpRequestLog.count({
                where: { phone, createdAt: { gte: windowStart } },
              }),
              tx.otpRequestLog.count({
                where: { ipHash, createdAt: { gte: windowStart } },
              }),
            ]);
            if (phoneRequests >= this.setting('otp.maxRequestsPerPhone', 5)) {
              this.rateLimited(
                'تعداد درخواست‌ها برای این شماره بیش از حد مجاز است',
                windowSeconds,
              );
            }
            if (ipRequests >= this.setting('otp.maxRequestsPerIp', 20)) {
              this.rateLimited(
                'تعداد درخواست‌ها از این اتصال بیش از حد مجاز است',
                windowSeconds,
              );
            }

            const code = randomInt(100_000, 1_000_000).toString();
            const codeHash = this.hash(`otp:${phone}:${code}`);
            const expiresAt = new Date(now.getTime() + expiresSeconds * 1000);
            const resendAfter = new Date(now.getTime() + resendSeconds * 1000);
            await tx.otpChallenge.upsert({
              where: { phone },
              create: {
                phone,
                codeHash,
                expiresAt,
                resendAfter,
              },
              update: {
                codeHash,
                expiresAt,
                resendAfter,
                attempts: 0,
                createdAt: now,
              },
            });
            await tx.otpRequestLog.create({ data: { phone, ipHash } });
            await tx.otpRequestLog.deleteMany({
              where: {
                createdAt: { lt: new Date(now.getTime() - 86_400_000) },
              },
            });
            return { code, codeHash };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('OTP challenge transaction retry exhausted');
  }

  private hash(value: string): string {
    const pepper = this.config.get<string>('otp.pepper');
    if (!pepper) throw new Error('OTP pepper is not configured');
    return createHmac('sha256', pepper).update(value).digest('hex');
  }

  private rateLimited(message: string, retryAfter: number): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message,
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
