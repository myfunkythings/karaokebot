export const staffRoles = ["owner", "host", "viewer"] as const;
export type StaffRole = (typeof staffRoles)[number];

export const sessionStatuses = ["draft", "active", "closed"] as const;
export type SessionStatus = (typeof sessionStatuses)[number];

export const songRequestStatuses = ["queued", "current", "sung", "cancelled"] as const;
export type SongRequestStatus = (typeof songRequestStatuses)[number];

export const songRequestOutcomes = [
  "sung",
  "cancelled_by_host",
  "left_venue",
  "undone"
] as const;
export type SongRequestOutcome = (typeof songRequestOutcomes)[number];

export const songRequestSources = ["telegram", "manual"] as const;
export type SongRequestSource = (typeof songRequestSources)[number];

export const orderModes = ["auto", "manual_pin"] as const;
export type OrderMode = (typeof orderModes)[number];

export const actorTypes = ["staff", "system", "telegram"] as const;
export type ActorType = (typeof actorTypes)[number];

export type QueuePolicyFlags = {
  prioritizeFirstTimeSinger: boolean;
  prioritizeLowerSungCount: boolean;
  prioritizeRequestTime: boolean;
};

export type BotReplyTemplates = {
  startMessage: string;
  unknownCommand: string;
  emptyMessage: string;
  requestAccepted: string;
  requestRejectedRateLimit: string;
  requestRejectedNoSession: string;
  statusCurrentPerformer: string;
  statusNoGuestProfile: string;
  statusNoActiveRequests: string;
  statusQueuedSummary: string;
  fallbackPositionUnavailable: string;
  fallbackRequestSaveFailed: string;
  fallbackStatusNoRequests: string;
  fallbackStatusNoActiveRequests: string;
  fallbackStatusQueuedSummary: string;
  fallbackStatusQueuedNoAhead: string;
  fallbackStatusQueuedAheadTemplate: string;
};

export type GlobalSettings = {
  antiSpamSeconds: number;
  skipDownPositions: number;
  queuePolicyFlags: QueuePolicyFlags;
  botReplyTemplates: BotReplyTemplates;
  uiLabels: Record<string, string>;
};

export type SessionSummary = {
  id: string;
  title: string;
  status: SessionStatus;
  version: number;
  openedAt: string | null;
  closedAt: string | null;
  timezone: string;
};

export type GuestProfileDto = {
  id: string;
  displayName: string;
  telegramUsername: string | null;
  telegramUserId: string | null;
};

export type SongRequestDto = {
  id: string;
  sessionId: string;
  guest: GuestProfileDto;
  rawText: string;
  artist: string | null;
  title: string | null;
  source: SongRequestSource;
  status: SongRequestStatus;
  outcome: SongRequestOutcome | null;
  requestedAt: string;
  calledAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  queueRank: number | null;
  orderMode: OrderMode;
  manualRank: number | null;
  deferCount: number;
  note: string | null;
};

export type QueueSnapshotDto = {
  session: SessionSummary | null;
  queueVersion: number | null;
  current: SongRequestDto | null;
  queued: SongRequestDto[];
  archive: SongRequestDto[];
  activeOperators: Array<{
    id: string;
    displayName: string;
    role: StaffRole;
    lastSeenAt: string;
  }>;
  recentActions: Array<{
    id: string;
    actorDisplayName: string;
    actionType: string;
    label: string;
    createdAt: string;
  }>;
  stats: {
    totalRequests: number;
    totalSung: number;
    totalCancelled: number;
    averageWaitMinutes: number;
  };
};

export type SessionStatsDto = {
  totalRequests: number;
  totalSung: number;
  totalCancelled: number;
  totalDeferred: number;
  averageWaitMinutes: number;
  topSingers: Array<{
    guestId: string;
    displayName: string;
    sungCount: number;
    requestsCount: number;
  }>;
};

export type LoginResponseDto = {
  user: {
    id: string;
    displayName: string;
    role: StaffRole;
    login: string;
  };
};
