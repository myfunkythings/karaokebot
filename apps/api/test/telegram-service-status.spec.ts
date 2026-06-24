import { describe, expect, it, vi } from "vitest";
import { TelegramService } from "../src/modules/telegram/telegram.service.js";

function createService() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);

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
      botReplyTemplates: {
        startMessage: "start",
        unknownCommand: "unknown"
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

  const service = new TelegramService(
    configService as never,
    prisma as never,
    songRequestsService as never,
    settingsService as never,
    requestChannelsService as never
  );

  return { fetchMock, prisma, service, songRequestsService };
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
    const { fetchMock, service, songRequestsService } = createService();

    await service.handleWebhook(makeUpdate("Узнать мою позицию"), "secondary-secret", "secondary");

    expect(songRequestsService.getTelegramGuestStatusSummary).toHaveBeenCalledWith(
      "400",
      "secondary"
    );
    expect(songRequestsService.createTelegramRequest).not.toHaveBeenCalled();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          keyboard: [
            [{ text: "Узнать мою позицию" }],
            [{ text: "Удалить все мои заявки из очереди" }]
          ]
        })
      })
    );
  });

  it("asks for confirmation before cancelling queued guest requests", async () => {
    const { fetchMock, service, songRequestsService } = createService();

    await service.handleWebhook(
      makeUpdate("Удалить все мои заявки из очереди"),
      "secondary-secret",
      "secondary"
    );

    expect(songRequestsService.cancelTelegramGuestQueuedRequests).not.toHaveBeenCalled();
    expect(songRequestsService.createTelegramRequest).not.toHaveBeenCalled();
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual(
      expect.objectContaining({
        text: expect.stringContaining("Точно удалить"),
        reply_markup: expect.objectContaining({
          keyboard: [
            [{ text: "Да, удалить мои заявки" }],
            [{ text: "Не удалять" }]
          ]
        })
      })
    );
  });

  it("cancels queued guest requests only after confirmation", async () => {
    const { service, songRequestsService } = createService();

    await service.handleWebhook(
      makeUpdate("Да, удалить мои заявки"),
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

    await service.handleWebhook(makeUpdate("Не удалять"), "secondary-secret", "secondary");

    expect(songRequestsService.cancelTelegramGuestQueuedRequests).not.toHaveBeenCalled();
    expect(songRequestsService.createTelegramRequest).not.toHaveBeenCalled();
  });

  it("keeps ordinary song messages on the request creation path", async () => {
    const { service, songRequestsService } = createService();

    await service.handleWebhook(makeUpdate("Кино - Пачка сигарет"), "main-secret");

    expect(songRequestsService.createTelegramRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        rawText: "Кино - Пачка сигарет",
        channelSlug: "main"
      })
    );
    expect(songRequestsService.getTelegramGuestStatusSummary).not.toHaveBeenCalled();
  });
});
