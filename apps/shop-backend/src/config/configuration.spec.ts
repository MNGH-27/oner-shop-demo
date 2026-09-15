import { validateEnvironment } from './configuration';

describe('validateEnvironment', () => {
  const valid = {
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_SECRET: 'a-secret-that-is-definitely-longer-than-32-characters',
  };

  it('accepts a safe minimal production configuration', () => {
    expect(validateEnvironment(valid)).toBe(valid);
  });

  it('rejects a weak JWT secret', () => {
    expect(() =>
      validateEnvironment({ ...valid, JWT_SECRET: 'secret' }),
    ).toThrow('JWT_SECRET');
  });

  it('requires explicit seed credentials when admin seeding is enabled', () => {
    expect(() => validateEnvironment({ ...valid, SEED_ADMIN: 'true' })).toThrow(
      'ADMIN_EMAIL',
    );
  });

  it('does not allow the console SMS provider in production', () => {
    expect(() =>
      validateEnvironment({
        ...valid,
        NODE_ENV: 'production',
        SMS_PROVIDER: 'console',
      }),
    ).toThrow('SMS_PROVIDER=console');
  });

  it('requires SMS.ir credentials when that provider is selected', () => {
    expect(() =>
      validateEnvironment({ ...valid, SMS_PROVIDER: 'smsir' }),
    ).toThrow('SMSIR_API_KEY');
  });

  it('accepts a valid SMS.ir configuration', () => {
    const environment = {
      ...valid,
      SMS_PROVIDER: 'smsir',
      SMSIR_API_KEY: 'test-api-key',
      SMSIR_TEMPLATE_ID: '123456',
      SMSIR_CODE_PARAMETER: 'Code',
    };
    expect(validateEnvironment(environment)).toBe(environment);
  });

  it('rejects a weak OTP pepper', () => {
    expect(() =>
      validateEnvironment({ ...valid, OTP_PEPPER: 'too-short' }),
    ).toThrow('OTP_PEPPER');
  });
});
