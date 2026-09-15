import { BadRequestException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../sms/sms.service';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  const pepper = 'an-otp-test-pepper-that-is-long-enough';
  const challenge = {
    phone: '09121234567',
    codeHash: '',
    attempts: 0,
    expiresAt: new Date(Date.now() + 120_000),
    resendAfter: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const prisma = {
    otpChallenge: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
    otpRequestLog: {
      count: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | number> = {
        'otp.pepper': pepper,
        'otp.expiresSeconds': 120,
        'otp.resendSeconds': 60,
        'otp.maxAttempts': 5,
        'otp.rateWindowSeconds': 600,
        'otp.maxRequestsPerPhone': 5,
        'otp.maxRequestsPerIp': 20,
      };
      return values[key];
    }),
  };
  const sms = { sendOtp: jest.fn() };
  const service = new OtpService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    sms as unknown as SmsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (operation: (client: typeof prisma) => Promise<unknown>) =>
        operation(prisma),
    );
    prisma.otpChallenge.upsert.mockResolvedValue(challenge);
    prisma.otpRequestLog.create.mockResolvedValue({});
    prisma.otpRequestLog.deleteMany.mockResolvedValue({ count: 0 });
    sms.sendOtp.mockResolvedValue(undefined);
  });

  it('generates a six digit code but persists only its keyed hash', async () => {
    prisma.otpChallenge.findUnique.mockResolvedValue(null);
    prisma.otpRequestLog.count.mockResolvedValue(0);

    const result = await service.request('09121234567', '127.0.0.1');

    expect(result).toMatchObject({ expiresIn: 120, retryAfter: 60 });
    expect(sms.sendOtp).toHaveBeenCalledWith(
      '09121234567',
      expect.stringMatching(/^\d{6}$/),
    );
    const upsertCalls = prisma.otpChallenge.upsert.mock
      .calls as unknown as Array<[{ create: { codeHash: string } }]>;
    expect(upsertCalls[0]?.[0].create.codeHash).toMatch(/^[a-f\d]{64}$/);
  });

  it('rejects a resend during the cooldown without sending another SMS', async () => {
    prisma.otpChallenge.findUnique.mockResolvedValue(challenge);

    await expect(
      service.request('09121234567', '127.0.0.1'),
    ).rejects.toBeInstanceOf(HttpException);
    expect(sms.sendOtp).not.toHaveBeenCalled();
  });

  it('consumes a correct code exactly once', async () => {
    const code = '123456';
    prisma.otpChallenge.findUnique.mockResolvedValue({
      ...challenge,
      codeHash: createHmac('sha256', pepper)
        .update(`otp:${challenge.phone}:${code}`)
        .digest('hex'),
    });
    prisma.otpChallenge.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      service.verify(challenge.phone, code),
    ).resolves.toBeUndefined();
    expect(prisma.otpChallenge.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('counts an incorrect verification attempt', async () => {
    prisma.otpChallenge.findUnique.mockResolvedValue({
      ...challenge,
      codeHash: createHmac('sha256', pepper)
        .update(`otp:${challenge.phone}:123456`)
        .digest('hex'),
    });
    prisma.otpChallenge.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.verify(challenge.phone, '654321'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.otpChallenge.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } }),
    );
  });
});
