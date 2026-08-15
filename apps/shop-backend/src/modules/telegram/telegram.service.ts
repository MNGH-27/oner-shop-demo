import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('telegram.botToken') &&
        this.config.get<string>('telegram.chatId'),
    );
  }

  async sendMessage(text: string): Promise<void> {
    const token = this.config.get<string>('telegram.botToken');
    const chatId = this.config.get<string>('telegram.chatId');

    if (!token || !chatId) {
      this.logger.debug(
        'Telegram skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing',
      );
      return;
    }

    const apiBase =
      this.config.get<string>('telegram.apiBase') ?? 'https://api.telegram.org';
    const proxy = this.config.get<string>('telegram.proxy')?.trim();
    const url = `${apiBase}/bot${token}/sendMessage`;

    try {
      const response = await undiciFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
        ...(proxy ? { dispatcher: new ProxyAgent(proxy) } : {}),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Telegram API ${response.status}: ${body}`);
      }
    } catch (error) {
      this.logger.error('Failed to send Telegram message', error);
      if (!proxy) {
        this.logger.warn(
          'اگر در ایران هستید، TELEGRAM_PROXY را روی پروکسی لوکال VPN ست کنید (مثلاً http://127.0.0.1:7890)',
        );
      }
    }
  }
}
