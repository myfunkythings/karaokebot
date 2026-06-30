import { describe, expect, it, vi } from "vitest";
import { QueueService } from "../src/modules/queue/queue.service.js";

function createService() {
  const channel = {
    id: "channel-main",
    slug: "main",
    name: "Основной бот",
    color: "#203B47"
  };
  const session = {
    id: "session-1",
    title: "Вечер",
    status: "active",
    version: 7,
    openedAt: new Date("2026-06-30T12:00:00.000Z"),
    closedAt: null,
    timezone: "Europe/Moscow"
  };
  const privateGuest = {
    id: "guest-1",
    displayName: "Private Guest",
    telegramUsername: "private_guest",
    telegramUserId: "123456"
  };
  const prisma = {
    songRequest: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "request-current",
          sessionId: "session-1",
          channelId: "channel-main",
          guestProfileId: "guest-1",
          guestProfile: privateGuest,
          rawText: "Queen - The Show Must Go On",
          artist: "Queen",
          title: "The Show Must Go On",
          source: "telegram",
          status: "current",
          outcome: null,
          requestedAt: new Date("2026-06-30T12:01:00.000Z"),
          calledAt: new Date("2026-06-30T12:10:00.000Z"),
          completedAt: null,
          cancelledAt: null,
          queueRank: null,
          orderMode: "auto",
          manualRank: null,
          deferCount: 0,
          note: "private note"
        },
        {
          id: "request-queued",
          sessionId: "session-1",
          channelId: "channel-main",
          guestProfileId: "guest-2",
          guestProfile: {
            id: "guest-2",
            displayName: "Second Private Guest",
            telegramUsername: "second_private",
            telegramUserId: "987654"
          },
          rawText: "Кино - Группа крови",
          artist: "Кино",
          title: "Группа крови",
          source: "manual",
          status: "queued",
          outcome: null,
          requestedAt: new Date("2026-06-30T12:02:00.000Z"),
          calledAt: null,
          completedAt: null,
          cancelledAt: null,
          queueRank: 1,
          orderMode: "manual_pin",
          manualRank: 1,
          deferCount: 2,
          note: "another private note"
        }
      ])
    }
  };
  const sessionsService = {
    getActiveSession: vi.fn().mockResolvedValue(session)
  };
  const requestChannelsService = {
    getRequiredChannelBySlug: vi.fn().mockResolvedValue(channel)
  };

  const service = new QueueService(
    prisma as never,
    {} as never,
    sessionsService as never,
    {} as never,
    requestChannelsService as never
  );

  return { prisma, requestChannelsService, service };
}

describe("QueueService public snapshot", () => {
  it("returns queue information without guest, staff, action, or internal request fields", async () => {
    const { prisma, requestChannelsService, service } = createService();

    const snapshot = await service.getPublicSnapshot("main");
    const serializedSnapshot = JSON.stringify(snapshot);

    expect(requestChannelsService.getRequiredChannelBySlug).toHaveBeenCalledWith("main");
    expect(prisma.songRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          channelId: "channel-main"
        })
      })
    );
    expect(snapshot.current).toEqual({
      position: null,
      rawText: "Queen - The Show Must Go On",
      artist: "Queen",
      title: "The Show Must Go On",
      status: "current"
    });
    expect(snapshot.queued).toEqual([
      {
        position: 1,
        rawText: "Кино - Группа крови",
        artist: "Кино",
        title: "Группа крови",
        status: "queued"
      }
    ]);
    expect(serializedSnapshot).not.toContain("guest");
    expect(serializedSnapshot).not.toContain("telegram");
    expect(serializedSnapshot).not.toContain("Private Guest");
    expect(serializedSnapshot).not.toContain("123456");
    expect(serializedSnapshot).not.toContain("note");
    expect(serializedSnapshot).not.toContain("activeOperators");
    expect(serializedSnapshot).not.toContain("recentActions");
    expect(serializedSnapshot).not.toContain("request-current");
    expect(serializedSnapshot).not.toContain("Вечер");
    expect(serializedSnapshot).not.toContain("Europe/Moscow");
  });
});
