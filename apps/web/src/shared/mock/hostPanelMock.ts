import type { LoginResponseDto, QueueSnapshotDto, SessionStatsDto } from "@karaoke/contracts";

const now = Date.now();
const mainChannel = {
  id: "channel-main",
  slug: "main",
  name: "Основной бот",
  color: "#203B47"
};
const secondaryChannel = {
  id: "channel-secondary",
  slug: "secondary",
  name: "Второй бот",
  color: "#DE7440"
};

function minutesAgo(minutes: number) {
  return new Date(now - minutes * 60_000).toISOString();
}

export const mockUser: LoginResponseDto["user"] = {
  id: "dev-host",
  displayName: "Локальный ведущий",
  role: "owner",
  login: "open-access"
};

export const mockQueueSnapshot: QueueSnapshotDto = {
  session: {
    id: "session-dev",
    title: "Среда, живая смена",
    status: "active",
    version: 7,
    openedAt: minutesAgo(114),
    closedAt: null,
    timezone: "Europe/Moscow"
  },
  queueVersion: 7,
  channels: [mainChannel, secondaryChannel],
  activeChannelSlug: "main",
  current: {
    id: "req-current",
    sessionId: "session-dev",
    channel: mainChannel,
    guest: {
      id: "guest-current",
      displayName: "Лена",
      telegramUsername: "lena_sings",
      telegramUserId: "tg-1"
    },
    rawText: "Кино - Кукушка",
    artist: "Кино",
    title: "Кукушка",
    source: "telegram",
    status: "current",
    outcome: null,
    requestedAt: minutesAgo(16),
    calledAt: minutesAgo(3),
    completedAt: null,
    cancelledAt: null,
    queueRank: null,
    orderMode: "auto",
    manualRank: null,
    deferCount: 0,
    note: null
  },
  queued: [
    {
      id: "req-1",
      sessionId: "session-dev",
      channel: mainChannel,
      guest: {
        id: "guest-1",
        displayName: "Андрей",
        telegramUsername: "andrey_rock",
        telegramUserId: "tg-2"
      },
      rawText: "Пачка сигарет",
      artist: "Кино",
      title: "Пачка сигарет",
      source: "telegram",
      status: "queued",
      outcome: null,
      requestedAt: minutesAgo(14),
      calledAt: null,
      completedAt: null,
      cancelledAt: null,
      queueRank: 1,
      orderMode: "auto",
      manualRank: null,
      deferCount: 0,
      note: null
    },
    {
      id: "req-2",
      sessionId: "session-dev",
      channel: mainChannel,
      guest: {
        id: "guest-2",
        displayName: "Маша",
        telegramUsername: "masha.mp3",
        telegramUserId: "tg-3"
      },
      rawText: "Emma Ruth Rundle - Living with a Black Dog",
      artist: "Emma Ruth Rundle",
      title: "Living with a Black Dog",
      source: "telegram",
      status: "queued",
      outcome: null,
      requestedAt: minutesAgo(12),
      calledAt: null,
      completedAt: null,
      cancelledAt: null,
      queueRank: 2,
      orderMode: "auto",
      manualRank: null,
      deferCount: 0,
      note: null
    },
    {
      id: "req-3",
      sessionId: "session-dev",
      channel: mainChannel,
      guest: {
        id: "guest-3",
        displayName: "Стас",
        telegramUsername: null,
        telegramUserId: null
      },
      rawText: "Би-2 - Полковнику никто не пишет",
      artist: "Би-2",
      title: "Полковнику никто не пишет",
      source: "manual",
      status: "queued",
      outcome: null,
      requestedAt: minutesAgo(10),
      calledAt: null,
      completedAt: null,
      cancelledAt: null,
      queueRank: 3,
      orderMode: "manual_pin",
      manualRank: 2,
      deferCount: 1,
      note: null
    },
    {
      id: "req-4",
      sessionId: "session-dev",
      channel: mainChannel,
      guest: {
        id: "guest-4",
        displayName: "Ира",
        telegramUsername: "ira.wave",
        telegramUserId: "tg-4"
      },
      rawText: "The Cranberries - Zombie",
      artist: "The Cranberries",
      title: "Zombie",
      source: "telegram",
      status: "queued",
      outcome: null,
      requestedAt: minutesAgo(7),
      calledAt: null,
      completedAt: null,
      cancelledAt: null,
      queueRank: 4,
      orderMode: "auto",
      manualRank: null,
      deferCount: 0,
      note: null
    },
    {
      id: "req-5",
      sessionId: "session-dev",
      channel: mainChannel,
      guest: {
        id: "guest-5",
        displayName: "Слава",
        telegramUsername: "slava_live",
        telegramUserId: "tg-5"
      },
      rawText: "Мумий Тролль - Медведица",
      artist: "Мумий Тролль",
      title: "Медведица",
      source: "telegram",
      status: "queued",
      outcome: null,
      requestedAt: minutesAgo(5),
      calledAt: null,
      completedAt: null,
      cancelledAt: null,
      queueRank: 5,
      orderMode: "auto",
      manualRank: null,
      deferCount: 0,
      note: null
    },
    {
      id: "req-6",
      sessionId: "session-dev",
      channel: mainChannel,
      guest: {
        id: "guest-6",
        displayName: "Юля",
        telegramUsername: "yu.lia",
        telegramUserId: "tg-6"
      },
      rawText: "Adele - Rolling in the Deep",
      artist: "Adele",
      title: "Rolling in the Deep",
      source: "telegram",
      status: "queued",
      outcome: null,
      requestedAt: minutesAgo(2),
      calledAt: null,
      completedAt: null,
      cancelledAt: null,
      queueRank: 6,
      orderMode: "auto",
      manualRank: null,
      deferCount: 0,
      note: null
    }
  ],
  archive: [
    {
      id: "arch-1",
      sessionId: "session-dev",
      channel: mainChannel,
      guest: {
        id: "guest-2",
        displayName: "Маша",
        telegramUsername: "masha.mp3",
        telegramUserId: "tg-3"
      },
      rawText: "Lana Del Rey - Video Games",
      artist: "Lana Del Rey",
      title: "Video Games",
      source: "telegram",
      status: "sung",
      outcome: "sung",
      requestedAt: minutesAgo(50),
      calledAt: minutesAgo(38),
      completedAt: minutesAgo(34),
      cancelledAt: null,
      queueRank: null,
      orderMode: "auto",
      manualRank: null,
      deferCount: 0,
      note: null
    },
    {
      id: "arch-2",
      sessionId: "session-dev",
      channel: mainChannel,
      guest: {
        id: "guest-5",
        displayName: "Слава",
        telegramUsername: "slava_live",
        telegramUserId: "tg-5"
      },
      rawText: "Сплин - Выхода нет",
      artist: "Сплин",
      title: "Выхода нет",
      source: "telegram",
      status: "sung",
      outcome: "sung",
      requestedAt: minutesAgo(78),
      calledAt: minutesAgo(66),
      completedAt: minutesAgo(61),
      cancelledAt: null,
      queueRank: null,
      orderMode: "auto",
      manualRank: null,
      deferCount: 0,
      note: null
    }
  ],
  activeOperators: [
    {
      id: "dev-host",
      displayName: "Локальный ведущий",
      role: "owner",
      lastSeenAt: new Date(now).toISOString()
    },
    {
      id: "dev-helper",
      displayName: "Лера",
      role: "owner",
      lastSeenAt: minutesAgo(1)
    }
  ],
  recentActions: [
    {
      id: "act-1",
      actorDisplayName: "Лера",
      actionType: "request_called",
      label: "вызвала заявку",
      createdAt: minutesAgo(2)
    },
    {
      id: "act-2",
      actorDisplayName: "Локальный ведущий",
      actionType: "queue_reordered",
      label: "переставил заявку",
      createdAt: minutesAgo(4)
    }
  ],
  stats: {
    totalRequests: 8,
    totalSung: 2,
    totalCancelled: 0,
    averageWaitMinutes: 11
  }
};

export const mockStats: SessionStatsDto = {
  totalRequests: 8,
  totalSung: 2,
  totalCancelled: 0,
  totalDeferred: 1,
  averageWaitMinutes: 11,
  topSingers: [
    {
      guestId: "guest-2",
      displayName: "Маша",
      sungCount: 1,
      requestsCount: 2
    },
    {
      guestId: "guest-5",
      displayName: "Слава",
      sungCount: 1,
      requestsCount: 2
    }
  ]
};
