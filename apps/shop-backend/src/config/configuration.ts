export default () => ({
  port: parseInt(process.env.PORT ?? '5000', 10),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'shop-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@shop.local',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@123456',
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
  adminPanelUrl: (
    process.env.ADMIN_PANEL_URL ?? 'http://127.0.0.1:5173'
  ).replace(/\/$/, ''),
  corsOrigins: process.env.CORS_ORIGINS ?? '',
});
