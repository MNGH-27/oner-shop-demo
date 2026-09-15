import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, fetch as undiciFetch } from 'undici';
import { SmsFetch, SmsService } from './sms.service';

describe('SmsService', () => {
  const settings: Record<string, string | number> = {
    'sms.provider': 'smsir',
    'sms.smsIrApiKey': 'private-api-key',
    'sms.smsIrTemplateId': 123456,
    'sms.smsIrCodeParameter': 'Code',
    'sms.requestTimeoutMs': 10_000,
  };
  const config = {
    get: jest.fn((key: string) => settings[key]),
  };
  let fetchMock: jest.MockedFunction<SmsFetch>;
  let service: SmsService;

  beforeEach(() => {
    fetchMock = jest.fn<ReturnType<typeof undiciFetch>, Parameters<SmsFetch>>();
    service = new SmsService(config as unknown as ConfigService, fetchMock);
  });

  it('sends the OTP through the SMS.ir verify endpoint', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 1,
          message: 'موفق',
          data: { messageId: 987654, cost: 1000 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await service.sendOtp('09121234567', '654321');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sms.ir/v1/send/verify',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-API-KEY': 'private-api-key',
        },
        body: JSON.stringify({
          mobile: '09121234567',
          templateId: 123456,
          parameters: [{ name: 'Code', value: '654321' }],
        }),
      }),
    );
  });

  it('does not treat an incomplete provider response as a successful send', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 102,
          message: 'اعتبار کافی نیست',
          data: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await expect(
      service.sendOtp('09121234567', '654321'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
