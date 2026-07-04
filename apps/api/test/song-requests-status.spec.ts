import { describe, expect, it, vi } from "vitest";
import { SongRequestsService } from "../src/modules/song-requests/song-requests.service.js";
import { DEFAULT_SETTINGS } from "../src/modules/settings/settings.constants.js";

function createService({
  activeCurrent = null,
  queuedRequests = []
}: {
  activeCurrent?: unknown;
  queuedRequests?: Array<{
    id: string;
    guestProfileId: string;
    queueRank: number | null;
    title: string | null;
    rawText: string;
    requestedAt: Date;
  }>;
}) {
  const prisma = {
    guestProfile: {
      findUnique: vi.fn().mockResolvedValue({ id: "guest-1", telegramUserId: "400" })
    },
    songRequest: {
      findFirst: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(activeCurrent),
      findMany: vi.fn().mockResolvedValue(queuedRequests)
    },
    sessionGuestStat: {
      findMany: vi.fn().mockResolvedValue([])
    }
  };
  const sessionsService = {
    getActiveSession: vi.fn().mockResolvedValue({ id: "session-1" })
  };
  const settingsService = {
    getGlobalSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS)
  };
  const requestChannelsService = {
    getRequiredChannelBySlug: vi.fn().mockResolvedValue({
      id: "channel-secondary",
      slug: "secondary"
    })
  };

  const service = new SongRequestsService(
    prisma as never,
    {} as never,
    sessionsService as never,
    {} as never,
    settingsService as never,
    {} as never,
    requestChannelsService as never
  );

  return { prisma, service };
}

describe("SongRequestsService.getTelegramGuestStatusSummary", () => {
  it("lists all queued songs for the guest with positions and approximate tracks ahead", async () => {
    const { service } = createService({
      activeCurrent: { id: "current-1", guestProfileId: "guest-3" },
      queuedRequests: [
        {
          id: "request-ahead-1",
          guestProfileId: "guest-2",
          queueRank: 1,
          title: "Ahead",
          rawText: "Ahead",
          requestedAt: new Date("2026-06-25T18:00:00.000Z")
        },
        {
          id: "request-guest",
          guestProfileId: "guest-1",
          queueRank: 2,
          title: "Guest song 1",
          rawText: "Guest raw",
          requestedAt: new Date("2026-06-25T18:01:00.000Z")
        },
        {
          id: "request-guest-2",
          guestProfileId: "guest-1",
          queueRank: 4,
          title: "Guest song 2",
          rawText: "Guest raw 2",
          requestedAt: new Date("2026-06-25T18:03:00.000Z")
        }
      ]
    });

    const message = await service.getTelegramGuestStatusSummary("400", "secondary");

    expect(message).toContain("1. Guest song 1 — примерно через 2 трека.");
    expect(message).toContain("2. Guest song 2 — примерно через 3 трека.");
    expect(message).toContain(
      "Это не финальное место: очередь пересчитывается после новых заявок и выступлений."
    );
  });

  it("explains when the guest is next", async () => {
    const { service } = createService({
      queuedRequests: [
        {
          id: "request-guest",
          guestProfileId: "guest-1",
          queueRank: 1,
          title: "Guest song",
          rawText: "Guest raw",
          requestedAt: new Date("2026-06-25T18:01:00.000Z")
        }
      ]
    });

    await expect(service.getTelegramGuestStatusSummary("400", "secondary")).resolves.toContain(
      "ты следующий/следующая"
    );
  });

  it("declines track counts in Telegram forecast text", async () => {
    const { service } = createService({});
    const serviceInternals = service as unknown as {
      formatTracksAhead(tracksAhead: number): string;
    };

    expect(serviceInternals.formatTracksAhead(1)).toBe("примерно через 1 трек");
    expect(serviceInternals.formatTracksAhead(2)).toBe("примерно через 2 трека");
    expect(serviceInternals.formatTracksAhead(5)).toBe("примерно через 5 треков");
    expect(serviceInternals.formatTracksAhead(11)).toBe("примерно через 11 треков");
    expect(serviceInternals.formatTracksAhead(21)).toBe("примерно через 21 трек");
    expect(serviceInternals.formatTracksAhead(22)).toBe("примерно через 22 трека");
    expect(serviceInternals.formatTracksAhead(25)).toBe("примерно через 25 треков");
  });
});

describe("SongRequestsService.cancelTelegramGuestQueuedRequests", () => {
  it("cancels only the guest queued requests in the current channel", async () => {
    const tx = {
      songRequest: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "request-guest-1",
            title: "Guest song 1",
            rawText: "Guest raw 1"
          },
          {
            id: "request-guest-2",
            title: null,
            rawText: "Guest raw 2"
          }
        ]),
        updateMany: vi.fn().mockResolvedValue({ count: 2 })
      }
    };
    const prisma = {
      $transaction: vi.fn((callback: (txArg: typeof tx) => Promise<string>) => callback(tx)),
      acquireSessionLock: vi.fn().mockResolvedValue(undefined),
      guestProfile: {
        findUnique: vi.fn().mockResolvedValue({ id: "guest-1", telegramUserId: "400" })
      }
    };
    const queueService = {
      refreshSessionDerivedState: vi.fn().mockResolvedValue(undefined)
    };
    const auditService = {
      recordAction: vi.fn().mockResolvedValue(undefined)
    };
    const service = new SongRequestsService(
      prisma as never,
      {} as never,
      { getActiveSession: vi.fn().mockResolvedValue({ id: "session-1" }) } as never,
      queueService as never,
      { getGlobalSettings: vi.fn().mockResolvedValue(DEFAULT_SETTINGS) } as never,
      auditService as never,
      {
        getRequiredChannelBySlug: vi.fn().mockResolvedValue({
          id: "channel-secondary",
          slug: "secondary"
        })
      } as never
    );

    const message = await service.cancelTelegramGuestQueuedRequests("400", "secondary");

    expect(tx.songRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sessionId: "session-1",
          guestProfileId: "guest-1",
          channelId: "channel-secondary"
        })
      })
    );
    expect(tx.songRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: {
            in: ["request-guest-1", "request-guest-2"]
          }
        }
      })
    );
    expect(queueService.refreshSessionDerivedState).toHaveBeenCalledWith("session-1", tx);
    expect(auditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "telegram",
        actorGuestId: "guest-1",
        actionType: "telegram_guest_queued_requests_cancelled"
      }),
      tx
    );
    expect(message).toContain("Удалил из очереди 2 заявки");
    expect(message).toContain("2. Guest raw 2");
  });
});

describe("SongRequestsService.createTelegramRequest", () => {
  it("renders the accepted request template with forecasted tracks ahead", async () => {
    const tx = {
      songRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "request-1",
          rawText: "Кино - Пачка сигарет",
          title: "Пачка сигарет"
        }),
        findUnique: vi.fn().mockResolvedValue({
          queueRank: 3,
          title: "Пачка сигарет",
          rawText: "Кино - Пачка сигарет"
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "request-ahead-1",
            guestProfileId: "guest-2",
            queueRank: 1,
            title: "Ahead",
            rawText: "Ahead",
            requestedAt: new Date("2026-06-25T18:00:00.000Z"),
            orderMode: "auto",
            manualRank: null
          },
          {
            id: "request-ahead-2",
            guestProfileId: "guest-3",
            queueRank: 2,
            title: "Ahead 2",
            rawText: "Ahead 2",
            requestedAt: new Date("2026-06-25T18:01:00.000Z"),
            orderMode: "auto",
            manualRank: null
          },
          {
            id: "request-ahead-3",
            guestProfileId: "guest-4",
            queueRank: 3,
            title: "Ahead 3",
            rawText: "Ahead 3",
            requestedAt: new Date("2026-06-25T18:02:00.000Z"),
            orderMode: "auto",
            manualRank: null
          },
          {
            id: "request-ahead-4",
            guestProfileId: "guest-5",
            queueRank: 4,
            title: "Ahead 4",
            rawText: "Ahead 4",
            requestedAt: new Date("2026-06-25T18:03:00.000Z"),
            orderMode: "auto",
            manualRank: null
          },
          {
            id: "request-ahead-5",
            guestProfileId: "guest-6",
            queueRank: 5,
            title: "Ahead 5",
            rawText: "Ahead 5",
            requestedAt: new Date("2026-06-25T18:04:00.000Z"),
            orderMode: "auto",
            manualRank: null
          },
          {
            id: "request-1",
            guestProfileId: "guest-1",
            queueRank: 6,
            title: "Пачка сигарет",
            rawText: "Кино - Пачка сигарет",
            requestedAt: new Date("2026-06-25T18:05:00.000Z"),
            orderMode: "auto",
            manualRank: null
          }
        ])
      },
      sessionGuestStat: {
        findMany: vi.fn().mockResolvedValue([])
      }
    };
    const prisma = {
      $transaction: vi.fn((callback: (txArg: typeof tx) => Promise<unknown>) =>
        callback(tx)
      ),
      acquireSessionLock: vi.fn().mockResolvedValue(undefined)
    };
    const queueService = {
      refreshSessionDerivedState: vi.fn().mockResolvedValue(undefined)
    };
    const auditService = {
      recordAction: vi.fn().mockResolvedValue(undefined)
    };
    const service = new SongRequestsService(
      prisma as never,
      {
        upsertTelegramGuest: vi.fn().mockResolvedValue({
          id: "guest-1"
        })
      } as never,
      { getActiveSession: vi.fn().mockResolvedValue({ id: "session-1" }) } as never,
      queueService as never,
      {
        getGlobalSettings: vi.fn().mockResolvedValue({
          ...DEFAULT_SETTINGS,
          botReplyTemplates: {
            ...DEFAULT_SETTINGS.botReplyTemplates,
            requestAccepted:
              "Перед вами примерно {{position}} {{trackPlural}}. Песня: {{title}}"
          }
        })
      } as never,
      auditService as never,
      {
        getRequiredChannelBySlug: vi.fn().mockResolvedValue({
          id: "channel-main",
          slug: "main"
        })
      } as never
    );

    const result = await service.createTelegramRequest({
      telegramUpdateId: "update-1",
      telegramChatId: "chat-1",
      telegramUserId: "400",
      rawText: "Кино - Пачка сигарет",
      channelSlug: "main"
    });

    expect(result.message).toBe("Перед вами примерно 5 треков. Песня: Пачка сигарет");
    expect(queueService.refreshSessionDerivedState).toHaveBeenCalledWith(
      "session-1",
      tx
    );
    expect(tx.songRequest.findUnique).toHaveBeenCalledWith({
      where: { id: "request-1" },
      select: {
        queueRank: true,
        title: true,
        rawText: true
      }
    });
  });
});
