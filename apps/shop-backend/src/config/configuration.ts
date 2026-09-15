const enabled = (value: string | undefined) => value === 'true';
const environmentText = (value: unknown) =>
  typeof value === 'string' ? value : '';
const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const databaseUrl = environmentText(environment.DATABASE_URL).trim();
  const jwtSecret = environmentText(environment.JWT_SECRET).trim();
  const seedAdmin = enabled(environmentText(environment.SEED_ADMIN));
  const adminEmail = environmentText(environment.ADMIN_EMAIL).trim();
  const adminPassword = environmentText(environment.ADMIN_PASSWORD);
  const nodeEnvironment =
    environmentText(environment.NODE_ENV).trim() || 'development';
  const smsProvider = (
    environmentText(environment.SMS_PROVIDER).trim() ||
    (nodeEnvironment === 'production' ? 'smsir' : 'console')
  ).toLowerCase();
  const smsIrApiKey = environmentText(environment.SMSIR_API_KEY).trim();
  const smsIrTemplateId = environmentText(environment.SMSIR_TEMPLATE_ID).trim();
  const smsIrCodeParameter =
    environmentText(environment.SMSIR_CODE_PARAMETER).trim() || 'Code';
  const otpPepper = environmentText(environment.OTP_PEPPER);
  const paymentProvider = (
    environmentText(environment.PAYMENT_PROVIDER).trim() ||
    (nodeEnvironment === 'production' ? 'zarinpal' : 'mock')
  ).toLowerCase();
  const zarinpalMerchantId = environmentText(
    environment.ZARINPAL_MERCHANT_ID,
  ).trim();
  const paymentCallbackBaseUrl = environmentText(
    environment.PAYMENT_CALLBACK_BASE_URL,
  ).trim();
  const storefrontUrl = environmentText(environment.STOREFRONT_URL).trim();

  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }
  if (seedAdmin && (!adminEmail || adminPassword.length < 12)) {
    throw new Error(
      'ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters are required when SEED_ADMIN=true',
    );
  }
  if (!['console', 'smsir'].includes(smsProvider)) {
    throw new Error('SMS_PROVIDER must be either console or smsir');
  }
  if (nodeEnvironment === 'production' && smsProvider === 'console') {
    throw new Error('SMS_PROVIDER=console is not allowed in production');
  }
  if (
    smsProvider === 'smsir' &&
    (!smsIrApiKey ||
      !/^[1-9]\d*$/.test(smsIrTemplateId) ||
      !Number.isSafeInteger(Number(smsIrTemplateId)) ||
      !smsIrCodeParameter)
  ) {
    throw new Error(
      'SMSIR_API_KEY, a numeric SMSIR_TEMPLATE_ID, and SMSIR_CODE_PARAMETER are required when SMS_PROVIDER=smsir',
    );
  }
  if (otpPepper && otpPepper.length < 32) {
    throw new Error('OTP_PEPPER must contain at least 32 characters');
  }
  if (!['mock', 'zarinpal'].includes(paymentProvider)) {
    throw new Error('PAYMENT_PROVIDER must be either mock or zarinpal');
  }
  if (nodeEnvironment === 'production' && paymentProvider === 'mock') {
    throw new Error('PAYMENT_PROVIDER=mock is not allowed in production');
  }
  if (
    paymentProvider === 'zarinpal' &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      zarinpalMerchantId,
    )
  ) {
    throw new Error('A valid ZARINPAL_MERCHANT_ID is required');
  }
  for (const [key, value] of [
    ['PAYMENT_CALLBACK_BASE_URL', paymentCallbackBaseUrl],
    ['STOREFRONT_URL', storefrontUrl],
  ] as const) {
    if (!value) continue;
    try {
      new URL(value);
    } catch {
      throw new Error(`${key} must be a valid absolute URL`);
    }
  }
  if (nodeEnvironment === 'production' && !paymentCallbackBaseUrl) {
    throw new Error('PAYMENT_CALLBACK_BASE_URL is required in production');
  }
  if (nodeEnvironment === 'production' && !storefrontUrl) {
    throw new Error('STOREFRONT_URL is required in production');
  }

  return environment;
}

export default () => ({
  port: parseInt(process.env.PORT ?? '5000', 10),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    phone: process.env.ADMIN_PHONE ?? '09120000000',
  },
  seed: {
    admin: enabled(process.env.SEED_ADMIN),
    demo: enabled(process.env.SEED_DEMO),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    chatId: process.env.TELEGRAM_CHAT_ID ?? '',
    /** مثلاً http://127.0.0.1:7890 برای Clash / V2Ray */
    proxy: process.env.TELEGRAM_PROXY ?? '',
    apiBase: (
      process.env.TELEGRAM_API_BASE ?? 'https://api.telegram.org'
    ).replace(/\/$/, ''),
  },
  sms: {
    provider:
      process.env.SMS_PROVIDER?.trim().toLowerCase() ||
      (process.env.NODE_ENV === 'production' ? 'smsir' : 'console'),
    smsIrApiKey: process.env.SMSIR_API_KEY?.trim() ?? '',
    smsIrTemplateId: positiveInteger(process.env.SMSIR_TEMPLATE_ID, 0),
    smsIrCodeParameter: process.env.SMSIR_CODE_PARAMETER?.trim() || 'Code',
    requestTimeoutMs: positiveInteger(process.env.SMS_TIMEOUT_MS, 10_000),
  },
  otp: {
    pepper: process.env.OTP_PEPPER ?? process.env.JWT_SECRET ?? '',
    expiresSeconds: positiveInteger(process.env.OTP_EXPIRES_SECONDS, 120),
    resendSeconds: positiveInteger(process.env.OTP_RESEND_SECONDS, 60),
    maxAttempts: positiveInteger(process.env.OTP_MAX_ATTEMPTS, 5),
    rateWindowSeconds: positiveInteger(
      process.env.OTP_RATE_WINDOW_SECONDS,
      600,
    ),
    maxRequestsPerPhone: positiveInteger(
      process.env.OTP_MAX_REQUESTS_PER_PHONE,
      5,
    ),
    maxRequestsPerIp: positiveInteger(process.env.OTP_MAX_REQUESTS_PER_IP, 20),
  },
  payment: {
    provider:
      process.env.PAYMENT_PROVIDER?.trim().toLowerCase() ||
      (process.env.NODE_ENV === 'production' ? 'zarinpal' : 'mock'),
    callbackBaseUrl: (
      process.env.PAYMENT_CALLBACK_BASE_URL ?? 'http://127.0.0.1:5000'
    ).replace(/\/$/, ''),
    storefrontUrl: (
      process.env.STOREFRONT_URL ?? 'http://localhost:3000'
    ).replace(/\/$/, ''),
    zarinpalMerchantId: process.env.ZARINPAL_MERCHANT_ID?.trim() ?? '',
    zarinpalSandbox: enabled(process.env.ZARINPAL_SANDBOX),
  },
  adminPanelUrl: (
    process.env.ADMIN_PANEL_URL ?? 'http://127.0.0.1:5173'
  ).replace(/\/$/, ''),
  corsOrigins: process.env.CORS_ORIGINS ?? '',
});
