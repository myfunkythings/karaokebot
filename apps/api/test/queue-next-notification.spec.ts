import { describe, expect, it, vi } from "vitest";
import {
  OrderMode,
  SongRequestSource,
  SongRequestStatus
} from "@prisma/client";
import { QueueService } from "../src/modules/queue/queue.service.js";

function createQueueService() {
  const session = { id: "session-1", version: 7 };
  const channel = { id: "channel-secondary", slug: "secondary", name: "Запой", color: "#DE7440" };
  const current = {
    id: "request-current",
    sessionId: session.id,
    channelId: channel.id,
    status: SongRequestStatus.current,
    outcome: null,
    calledAt: new Date("2026-06-30T12:00:00.000Z"),
    completedAt: null,
    cancelledAt: null,
    queueRank: null,
    orderMode: OrderMode.auto,
    manualRank: null,
    deferCount: 0,
    note: null
  };
  const next = {
    ...current,
    id: "request-next",
    status: SongRequestStatus.queued,
    calledAt: null,
    queueRank: 1
  };
  const firstStillQueued = {
    id: "request-after-next",
    guestProfileId: "guest-after-next",
    telegramUpdateId: "telegram-update-after-next"
  };

  const tx = {
    session: {
      findUnique: vi.fn().mockResolvedValue({ version: session.version })
    },
    songRequest: {
      findFirst: vi
        .fn()
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(next),
      update: vi.fn().mockResolvedValue({})
    }
  };

  const prisma = {
    acquireSessionLock: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn(async (callback: (txClient: typeof tx) => Promise<void>) => callback(tx)),
    songRequest: {
      findFirst: vi.fn().mockResolvedValue(firstStillQueued)
    },
    telegramUpdate: {
      findFirst: vi.fn().mockResolvedValue({ telegramChatId: "chat-after-next" })
    }
  };
  const auditService = {
    recordAction: vi.fn().mockResolvedValue(undefined)
  };
  const sessionsService = {
    getRequiredActiveSession: vi.fn().mockResolvedValue(session)
  };
  const requestChannelsService = {
    getRequiredChannelBySlug: vi.fn().mockResolvedValue(channel)
  };
  const telegramOutboundService = {
    sendMessage: vi.fn().mockResolvedValue(undefined)
  };

  const service = new QueueService(
    prisma as never,
    auditService as never,
    sessionsService as never,
    {} as never,
    requestChannelsService as never,
    telegramOutboundService as never
  );
  vi.spyOn(service, "refreshSessionDerivedState").mockResolvedValue(undefined);
  vi.spyOn(service, "getSnapshot").mockResolvedValue({ ok: true } as never);

  return {
    channel,
    firstStillQueued,
    prisma,
    service,
    telegramOutboundService
  };
}

function createCallRequestService() {
  const session = { id: "session-1", version: 7 };
  const channel = { id: "channel-main", slug: "main", name: "Мишка", color: "#203B47" };
  const request = {
    id: "request-called",
    sessionId: session.id,
    channelId: channel.id,
    channel,
    status: SongRequestStatus.queued,
    outcome: null,
    calledAt: null,
    completedAt: null,
    cancelledAt: null,
    queueRank: 2,
    orderMode: OrderMode.manual_pin,
    manualRank: 2,
    deferCount: 0,
    note: null
  };
  const current = {
    ...request,
    id: "request-current",
    status: SongRequestStatus.current,
    calledAt: new Date("2026-06-30T12:00:00.000Z"),
    queueRank: null,
    orderMode: OrderMode.auto,
    manualRank: null
  };

  const tx = {
    session: {
      findUnique: vi.fn().mockResolvedValue({ version: session.version })
    },
    songRequest: {
      findUnique: vi.fn().mockResolvedValue(request),
      findFirst: vi.fn().mockResolvedValue(current),
      update: vi.fn().mockResolvedValue({})
    }
  };

  const prisma = {
    acquireSessionLock: vi.fn().mockResolvedValue(undefined),
    $transaction: vi.fn(async (callback: (txClient: typeof tx) => Promise<void>) => callback(tx)),
    songRequest: {
      findFirst: vi.fn().mockResolvedValue({
        id: "request-next-after-call",
        guestProfileId: "guest-next-after-call",
        telegramUpdateId: "telegram-update-next-after-call"
      })
    },
    telegramUpdate: {
      findFirst: vi.fn().mockResolvedValue({ telegramChatId: "chat-next-after-call" })
    }
  };
  const telegramOutboundService = {
    sendMessage: vi.fn().mockResolvedValue(undefined)
  };

  const service = new QueueService(
    prisma as never,
    { recordAction: vi.fn().mockResolvedValue(undefined) } as never,
    { getRequiredActiveSession: vi.fn().mockResolvedValue(session) } as never,
    {} as never,
    {} as never,
    telegramOutboundService as never
  );
  vi.spyOn(service, "refreshSessionDerivedState").mockResolvedValue(undefined);
  vi.spyOn(service, "getSnapshot").mockResolvedValue({ ok: true } as never);

  return { service, telegramOutboundService };
}

describe("QueueService next song Telegram notification", () => {
  it("notifies the first queued Telegram guest after moving to the next performer", async () => {
    const { channel, firstStillQueued, prisma, service, telegramOutboundService } =
      createQueueService();

    await service.moveToNextPerformer("staff-1", 7, "secondary");

    expect(prisma.songRequest.findFirst).toHaveBeenCalledWith({
      where: {
        sessionId: "session-1",
        channelId: channel.id,
        status: SongRequestStatus.queued,
        source: SongRequestSource.telegram
      },
      orderBy: [{ queueRank: "asc" }, { requestedAt: "asc" }],
      select: {
        id: true,
        guestProfileId: true,
        telegramUpdateId: true
      }
    });
    expect(prisma.telegramUpdate.findFirst).toHaveBeenCalledWith({
      where: {
        channelId: channel.id,
        OR: [
          { linkedSongRequestId: firstStillQueued.id },
          { guestProfileId: firstStillQueued.guestProfileId },
          { telegramUpdateId: firstStillQueued.telegramUpdateId }
        ]
      },
      orderBy: { receivedAt: "desc" },
      select: {
        telegramChatId: true
      }
    });
    expect(telegramOutboundService.sendMessage).toHaveBeenCalledWith(
      "secondary",
      "chat-after-next",
      "Ваша песня следующая"
    );
  });

  it("notifies the first queued Telegram guest after manually calling a request", async () => {
    const { service, telegramOutboundService } = createCallRequestService();

    await service.callRequest("request-called", "staff-1", 7);

    expect(telegramOutboundService.sendMessage).toHaveBeenCalledWith(
      "main",
      "chat-next-after-call",
      "Ваша песня следующая"
    );
  });
});
