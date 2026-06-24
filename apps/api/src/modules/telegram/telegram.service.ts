import {
  ForbiddenException,
  Injectable,
  Logger,
  OnApplicationBootstrap
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/db/prisma.service.js";
import { SongRequestsService } from "../song-requests/song-requests.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { RequestChannelsService } from "../request-channels/request-channels.service.js";
import { resolveTelegramWebhookUrl } from "./telegram-webhook.js";

type TelegramMessage = {
  message_id?: number;
  text?: string;
  chat?: { id?: number | string };
  from?: {
    id?: number | string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};

@Injectable()
export class TelegramService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly songRequestsService: SongRequestsService,
    private readonly settingsService: SettingsService,
    private readonly requestChannelsService: RequestChannelsService
  ) {}

  async onApplicationBootstrap() {
    await this.ensureWebhook();
  }

  async handleWebhook(
    update: TelegramUpdate,
    providedSecret?: string,
    channelSlug?: string | null
  ) {
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);
    this.assertSecret(channel.slug, providedSecret);

    const updateId = String(update.update_id ?? "");
    if (!updateId) {
      return { ok: true, ignored: true };
    }

    const existing = await this.prisma.telegramUpdate.findUnique({
      where: {
        channelId_telegramUpdateId: {
          channelId: channel.id,
          telegramUpdateId: updateId
        }
      }
    });
    if (existing) {
      return { ok: true, duplicate: true };
    }

    const message = update.message;
    const sender = message?.from;
    const text = message?.text?.trim();
    const telegramUserId = sender?.id ? String(sender.id) : null;
    const telegramChatId = message?.chat?.id ? String(message.chat.id) : null;

    const telegramUpdate = await this.prisma.telegramUpdate.create({
      data: {
        channelId: channel.id,
        telegramUpdateId: updateId,
        telegramChatId: telegramChatId ?? "unknown",
        telegramMessageId: message?.message_id ? String(message.message_id) : null,
        rawPayloadJson: update,
        processingStatus: "ignored"
      }
    });

    if (!text || !telegramUserId || !telegramChatId) {
      await this.prisma.telegramUpdate.update({
        where: { id: telegramUpdate.id },
        data: {
          processingStatus: "ignored",
          processedAt: new Date()
        }
      });
      return { ok: true, ignored: true };
    }

    try {
      const settings = await this.settingsService.getGlobalSettings();
      let replyText = "";
      let guestProfileId: string | null = null;
      let linkedSongRequestId: string | null = null;

      if (text.startsWith("/")) {
        if (text === "/start") {
          replyText = settings.botReplyTemplates.startMessage;
        } else if (text === "/status") {
          replyText =
            await this.songRequestsService.getTelegramGuestStatusSummary(telegramUserId, channel.slug);
        } else {
          replyText = settings.botReplyTemplates.unknownCommand;
        }
      } else {
        const result = await this.songRequestsService.createTelegramRequest({
          telegramUpdateId: updateId,
          telegramChatId,
          telegramMessageId: message?.message_id ? String(message.message_id) : null,
          telegramUserId,
          telegramUsername: sender?.username,
          firstName: sender?.first_name,
          lastName: sender?.last_name,
          rawText: text,
          channelSlug: channel.slug
        });

        replyText = result.message;
        guestProfileId = result.guestProfileId;
        linkedSongRequestId = result.status === "accepted" ? result.requestId : null;
      }

      await this.sendMessage(channel.slug, telegramChatId, replyText);

      await this.prisma.telegramUpdate.update({
        where: { id: telegramUpdate.id },
        data: {
          guestProfileId,
          linkedSongRequestId,
          processingStatus: "accepted",
          processedAt: new Date()
        }
      });

      return { ok: true };
    } catch (error) {
      this.logger.error("Failed to process Telegram webhook", error as Error);
      await this.prisma.telegramUpdate.update({
        where: { id: telegramUpdate.id },
        data: {
          processingStatus: "error",
          processedAt: new Date(),
          errorText: error instanceof Error ? error.message : "Unknown error"
        }
      });
      throw error;
    }
  }

  async getGuestStatus(
    telegramUserId: string,
    providedSecret?: string,
    channelSlug?: string | null
  ) {
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);
    this.assertSecret(channel.slug, providedSecret);

    return {
      ok: true,
      message: await this.songRequestsService.getTelegramGuestStatusSummary(
        telegramUserId,
        channel.slug
      )
    };
  }

  async getBotReplyTemplates(providedSecret?: string, channelSlug?: string | null) {
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);
    this.assertSecret(channel.slug, providedSecret);
    const settings = await this.settingsService.getGlobalSettings();

    return {
      ok: true,
      botReplyTemplates: settings.botReplyTemplates,
      antiSpamSeconds: settings.antiSpamSeconds
    };
  }

  private async sendMessage(channelSlug: string, chatId: string, text: string) {
    const token = this.getBotToken(channelSlug);
    if (!token || token === "replace-me") {
      this.logger.warn(
        `Telegram bot token is not configured for channel "${channelSlug}"; skipping outbound reply`
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
        text
      })
    });

    if (!response.ok) {
      this.logger.warn(`Telegram sendMessage failed with ${response.status}`);
    }
  }

  private assertSecret(channelSlug: string, providedSecret?: string) {
    const expectedSecret = this.getWebhookSecret(channelSlug);
    if (!expectedSecret || providedSecret !== expectedSecret) {
      throw new ForbiddenException("Invalid Telegram webhook secret");
    }
  }

  private async ensureWebhook() {
    const channels = await this.requestChannelsService.getActiveChannels();
    for (const channel of channels) {
      await this.ensureChannelWebhook(channel.slug);
    }
  }

  private async ensureChannelWebhook(channelSlug: string) {
    const token = this.getBotToken(channelSlug);
    if (!token || token === "replace-me") {
      this.logger.warn(
        `Telegram bot token is not configured for channel "${channelSlug}"; skipping webhook registration`
      );
      return;
    }

    const secret = this.getWebhookSecret(channelSlug);
    const webhookUrl = resolveTelegramWebhookUrl({
      explicitUrl: this.getExplicitWebhookUrl(channelSlug),
      domain: this.configService.get<string>("DOMAIN"),
      channelSlug
    });

    if (!secret || !webhookUrl) {
      this.logger.warn(
        `Telegram webhook URL or secret is missing for channel "${channelSlug}"; skipping webhook registration`
      );
      return;
    }

    try {
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${token}/getWebhookInfo`
      );
      const infoBody = (await infoResponse.json()) as {
        ok?: boolean;
        result?: { url?: string; pending_update_count?: number; last_error_message?: string };
      };

      const currentUrl = infoBody.result?.url?.replace(/\/+$/, "");
      if (infoResponse.ok && infoBody.ok && currentUrl === webhookUrl) {
        this.logger.log(
          `Telegram webhook is already configured (${webhookUrl}), pending updates: ${infoBody.result?.pending_update_count ?? 0}`
        );
        return;
      }

      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["message"]
        })
      });

      const responseBody = (await response.json()) as {
        ok?: boolean;
        description?: string;
      };

      if (!response.ok || !responseBody.ok) {
        this.logger.error(
          `Failed to register Telegram webhook: ${responseBody.description ?? response.statusText}`
        );
        return;
      }

      this.logger.log(`Telegram webhook registered for channel "${channelSlug}": ${webhookUrl}`);
    } catch (error) {
      this.logger.error("Failed to ensure Telegram webhook", error as Error);
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

  private getWebhookSecret(channelSlug: string) {
    if (channelSlug === "main") {
      return this.configService.get<string>("TELEGRAM_WEBHOOK_SECRET");
    }

    return this.configService.get<string>(
      `TELEGRAM_${this.toEnvSlug(channelSlug)}_WEBHOOK_SECRET`
    );
  }

  private getExplicitWebhookUrl(channelSlug: string) {
    if (channelSlug === "main") {
      return this.configService.get<string>("TELEGRAM_WEBHOOK_URL");
    }

    return this.configService.get<string>(
      `TELEGRAM_${this.toEnvSlug(channelSlug)}_WEBHOOK_URL`
    );
  }

  private toEnvSlug(channelSlug: string) {
    return channelSlug.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  }
}
