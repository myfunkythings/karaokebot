import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GlobalSettings } from "@karaoke/contracts";
import { SettingsService } from "../settings/settings.service.js";
import { getTelegramPublicQueueUrl } from "./telegram-public-queue-url.js";

type TelegramKeyboardRow = Array<{ text: string; web_app?: { url: string } }>;

@Injectable()
export class TelegramOutboundService {
  private readonly logger = new Logger(TelegramOutboundService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService
  ) {}

  async sendMessage(
    channelSlug: string,
    chatId: string,
    text: string,
    keyboardRows?: TelegramKeyboardRow[]
  ) {
    const resolvedKeyboardRows =
      keyboardRows ??
      this.getDefaultKeyboardRows(
        channelSlug,
        await this.settingsService.getGlobalSettings(channelSlug)
      );
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
          keyboard: resolvedKeyboardRows,
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

  private getDefaultKeyboardRows(
    channelSlug: string,
    settings: GlobalSettings
  ): TelegramKeyboardRow[] {
    return [
      [{ text: settings.botReplyTemplates.telegramStatusButtonText }],
      [
        {
          text: settings.botReplyTemplates.telegramViewQueueButtonText,
          web_app: {
            url: getTelegramPublicQueueUrl(channelSlug)
          }
        }
      ],
      [{ text: settings.botReplyTemplates.telegramCancelButtonText }]
    ];
  }
}
