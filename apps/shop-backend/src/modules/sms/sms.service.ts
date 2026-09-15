import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch as undiciFetch } from 'undici';

export const SMS_FETCH = Symbol('SMS_FETCH');
export type SmsFetch = typeof undiciFetch;

interface SmsIrResponse {
  status?: number;
  message?: string;
  data?: {
    messageId?: number;
    cost?: number;
  };
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(SMS_FETCH) private readonly fetcher: SmsFetch,
  ) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const provider = this.config.get<string>('sms.provider') ?? 'console';

    if (provider === 'console') {
      this.logger.warn(`[DEV SMS] OTP for ${phone}: ${code}`);
      return;
    }

    await this.sendWithSmsIr(phone, code);
  }

  private async sendWithSmsIr(phone: string, code: string): Promise<void> {
    const apiKey = this.config.get<string>('sms.smsIrApiKey');
    const templateId = this.config.get<number>('sms.smsIrTemplateId');
    const codeParameter =
      this.config.get<string>('sms.smsIrCodeParameter') ?? 'Code';
    const timeoutMs = this.config.get<number>('sms.requestTimeoutMs') ?? 10_000;

    if (!apiKey || !templateId || !codeParameter) {
      this.logger.error('SMS.ir settings are incomplete');
      throw new ServiceUnavailableException(
        'سرویس پیامک در حال حاضر در دسترس نیست',
      );
    }

    try {
      const response = await this.fetcher('https://api.sms.ir/v1/send/verify', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
        body: JSON.stringify({
          mobile: phone,
          templateId,
          parameters: [{ name: codeParameter, value: code }],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const payload = (await response.json()) as SmsIrResponse;

      if (!response.ok || typeof payload.data?.messageId !== 'number') {
        this.logger.error(
          `SMS.ir rejected OTP delivery (HTTP ${response.status}, status ${payload.status ?? 'unknown'}): ${payload.message ?? 'unknown error'}`,
        );
        throw new ServiceUnavailableException(
          'ارسال پیامک انجام نشد؛ کمی بعد دوباره تلاش کنید',
        );
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('SMS.ir OTP request failed', error);
      throw new ServiceUnavailableException(
        'ارسال پیامک انجام نشد؛ کمی بعد دوباره تلاش کنید',
      );
    }
  }
}
