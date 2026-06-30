import { describe, expect, it, vi } from "vitest";
import { TelegramService } from "../src/modules/telegram/telegram.service.js";
import { DEFAULT_SETTINGS } from "../src/modules/settings/settings.constants.js";

function createService() {
  const configService = {
    get: vi.fn((key: string) => {
      if (key === "TELEGRAM_WEBHOOK_SECRET") {
        return "main-secret";
      }

      if (key === "TELEGRAM_SECONDARY_WEBHOOK_SECRET") {
        return "secondary-secret";
      }

      if (key === "TELEGRAM_BOT_TOKEN" || key === "TELEGRAM_SECONDARY_BOT_TOKEN") {
        return "bot-token";
      }

      return undefined;
    })
  };
  const prisma = {
    telegramUpdate: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "update-1" }),
      update: vi.fn().mockResolvedValue({})
    }
  };
  const songRequestsService = {
    getTelegramGuestStatusSummary: vi.fn().mockResolvedValue("status reply"),
    cancelTelegramGuestQueuedRequests: vi.fn().mockResolvedValue("cancel reply"),
    createTelegramRequest: vi.fn().mockResolvedValue({
      status: "accepted",
      message: "request accepted",
      requestId: "request-1",
      guestProfileId: "guest-1"
    })
  };
  const settingsService = {
    getGlobalSettings: vi.fn().mockResolvedValue({
      ...DEFAULT_SETTINGS,
      botReplyTemplates: {
        ...DEFAULT_SETTINGS.botReplyTemplates,
        startMessage: "start",
        unknownCommand: "unknown",
        telegramStatusButtonText: "Позиция",
        telegramViewQueueButtonText: "Открыть очередь",
        telegramCancelButtonText: "Стереть мои заявки",
        telegramCancelConfirmButtonText: "Да, стереть",
        telegramCancelAbortButtonText: "Оставить",
        telegramViewQueueReplyTemplate: "Очередь тут: {{url}}",
        telegramCancelConfirmationMessage: "Точно стереть заявки?",
        telegramCancelAbortMessage: "Ок, оставил.",
        telegramNextSongNotification: "Скоро твой номер"
      }
    })
  };
  const requestChannelsService = {
    getRequiredChannelBySlug: vi.fn(async (slug?: string | null) => ({
      id: slug === "secondary" ? "channel-secondary" : "channel-main",
      slug: slug ?? "main",
      isActive: true
    })),
    getActiveChannels: vi.fn().mockResolvedValue([])
  };
  const telegramOutboundService = {
    sendMessage: vi.fn().mockResolvedValue(undefined)
  };

  const service = new TelegramService(
    configService as never,
    prisma as never,
    songRequestsService as never,
    settingsService as never,
    requestChannelsService as never,
    telegramOutboundService as never
  );

  return { prisma, service, songRequestsService, telegramOutboundService };
}

function makeUpdate(text: string) {
  return {
    update_id: 100,
    message: {
      message_id: 200,
      text,
      chat: { id: 300 },
      from: {
        id: 400,
        username: "guest"
      }
    }
  };
}

describe("TelegramService status text handling", () => {
  it("answers 'моя позиция' through the channel status flow instead of creating a song request", async () => {
    const { service, songRequestsService, telegramOutboundService } = createService();

    await service.handleWebhook(makeUpdate("Позиция"), "secondary-secret", "secondary");

    expect(songRequestsService.getTelegramGuestStatusSummary).toHaveBeenCalledWith(
      "400",
      "secondary"
    );
    expect(songRequestsService.createTelegramRequest).not.toHaveBeenCalled();
    expect(telegramOutboundService.sendMessage).toHaveBeenCalledWith(
      "secondary",
      "300",
      "status reply",
      [
        [{ text: "Позиция" }],
        [
          {
            text: "Открыть очередь",
            web_app: {
              url: "https://zapoi.john-doe.ru/"
            }
          }
        ],
        [{ text: "Стереть мои заявки" }]
      ]
    );
  });

  it("asks for confirmation before cancelling queued guest requests", async () => {
    const { service, songRequestsService, telegramOutboundService } = createService();

    await service.handleWebhook(
      makeUpdate("Стереть мои заявки"),
      "secondary-secret",
      "secondary"
    );

    expect(songRequestsService.cancelTelegramGuestQueuedRequests).not.toHaveBeenCalled();
    expect(songRequestsService.createTelegramRequest).not.toHaveBeenCalled();
    expect(telegramOutboundService.sendMessage).toHaveBeenCalledWith(
      "secondary",
      "300",
      "Точно стереть заявки?",
      [
        [{ text: "Да, стереть" }],
        [{ text: "Оставить" }]
      ]
    );
  });

  it("cancels queued guest requests only after confirmation", async () => {
    const { service, songRequestsService } = createService();

    await service.handleWebhook(
      makeUpdate("Да, стереть"),
      "secondary-secret",
      "secondary"
    );

    expect(songRequestsService.cancelTelegramGuestQueuedRequests).toHaveBeenCalledWith(
      "400",
      "secondary"
    );
    expect(songRequestsService.createTelegramRequest).not.toHaveBeenCalled();
  });

  it("keeps queued guest requests when cancellation is aborted", async () => {
    const { service, songRequestsService } = createService();

    await service.handleWebhook(makeUpdate("Оставить"), "secondary-secret", "secondary");

    expect(songRequestsService.cancelTelegramGuestQueuedRequests).not.toHaveBeenCalled();
    expect(songRequestsService.createTelegramRequest).not.toHaveBeenCalled();
  });

  it("keeps ordinary song messages on the request creation path", async () => {
    const { service, songRequestsService, telegramOutboundService } = createService();

    await service.handleWebhook(makeUpdate("Кино - Пачка сигарет"), "main-secret");

    expect(songRequestsService.createTelegramRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        rawText: "Кино - Пачка сигарет",
        channelSlug: "main"
      })
    );
    expect(songRequestsService.getTelegramGuestStatusSummary).not.toHaveBeenCalled();
    expect(telegramOutboundService.sendMessage).toHaveBeenCalledWith(
      "main",
      "300",
      "request accepted",
      [
        [{ text: "Позиция" }],
        [
          {
            text: "Открыть очередь",
            web_app: {
              url: "https://calc1.printninjas.ru/karaoke/queue/mishka"
            }
          }
        ],
        [{ text: "Стереть мои заявки" }]
      ]
    );
  });

  it("answers queue button text with the public queue link", async () => {
    const { service, songRequestsService, telegramOutboundService } = createService();

    await service.handleWebhook(makeUpdate("Открыть очередь"), "secondary-secret", "secondary");

    expect(songRequestsService.createTelegramRequest).not.toHaveBeenCalled();
    expect(telegramOutboundService.sendMessage).toHaveBeenCalledWith(
      "secondary",
      "300",
      "Очередь тут: https://zapoi.john-doe.ru/",
      expect.any(Array)
    );
  });
});
