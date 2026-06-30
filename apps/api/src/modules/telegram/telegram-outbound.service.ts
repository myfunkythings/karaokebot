import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  TELEGRAM_CANCEL_BUTTON_TEXT,
  TELEGRAM_STATUS_BUTTON_TEXT,
  TELEGRAM_VIEW_QUEUE_BUTTON_TEXT
} from "./telegram-status-intent.js";
import { getTelegramPublicQueueUrl } from "./telegram-public-queue-url.js";

type TelegramKeyboardRow = Array<{ text: string; web_app?: { url: string } }>;

@Injectable()
export class TelegramOutboundService {
  private readonly logger = new Logger(TelegramOutboundService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMessage(
    channelSlug: string,
    chatId: string,
    text: string,
    keyboardRows = this.getDefaultKeyboardRows(channelSlug)
  ) {
    const token = this.getBotToken(channelSlug);
    if (!token || token === "replace-me") {
      this.logger.warn(
        `Telegram bot token is not configured for channel "${channelSlug}"; skipping outbound message`
      );
      return;
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          keyboard: keyboardRows,
          resize_keyboard: true,
          one_time_keyboard: false
        }
      })
    });

    if (!response.ok) {
      this.logger.warn(`Telegram sendMessage failed with ${response.status}`);
    }
  }

  private getBotToken(channelSlug: string) {
    if (channelSlug === "main") {
      return this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    }

    return this.configService.get<string>(
      `TELEGRAM_${this.toEnvSlug(channelSlug)}_BOT_TOKEN`
    );
  }

  private toEnvSlug(channelSlug: string) {
    return channelSlug.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  }

  private getDefaultKeyboardRows(channelSlug: string): TelegramKeyboardRow[] {
    return [
      [{ text: TELEGRAM_STATUS_BUTTON_TEXT }],
      [
        {
          text: TELEGRAM_VIEW_QUEUE_BUTTON_TEXT,
          web_app: {
            url: getTelegramPublicQueueUrl(channelSlug)
          }
        }
      ],
      [{ text: TELEGRAM_CANCEL_BUTTON_TEXT }]
    ];
  }
}
