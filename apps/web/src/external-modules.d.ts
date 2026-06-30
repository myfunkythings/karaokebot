declare module "@karaoke/contracts" {
  export type StaffRole = "owner" | "host" | "viewer";

  export type GlobalSettings = {
    antiSpamSeconds: number;
    skipDownPositions: number;
    queuePolicyFlags: {
      prioritizeFirstTimeSinger: boolean;
      prioritizeLowerSungCount: boolean;
      prioritizeRequestTime: boolean;
    };
    botReplyTemplates: {
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
      telegramStatusButtonText: string;
      telegramViewQueueButtonText: string;
      telegramCancelButtonText: string;
      telegramCancelConfirmButtonText: string;
      telegramCancelAbortButtonText: string;
      telegramViewQueueReplyTemplate: string;
      telegramCancelConfirmationMessage: string;
      telegramCancelAbortMessage: string;
      telegramNextSongNotification: string;
    };
    uiLabels: Record<string, string>;
  };

  export type LoginResponseDto = {
    user: {
      id: string;
      displayName: string;
      role: StaffRole;
      login: string;
    };
  };

  export type RequestChannelDto = {
    id: string;
    slug: string;
    name: string;
    color: string | null;
  };

  export type SongRequestDto = {
    id: string;
    sessionId: string;
    channel: RequestChannelDto;
    guest: {
      id: string;
      displayName: string;
      telegramUsername: string | null;
      telegramUserId: string | null;
    };
    rawText: string;
    artist: string | null;
    title: string | null;
    source: "telegram" | "manual";
    status: "queued" | "current" | "sung" | "cancelled";
    outcome: "sung" | "cancelled_by_host" | "left_venue" | "undone" | null;
    requestedAt: string;
    calledAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    queueRank: number | null;
    orderMode: "auto" | "manual_pin";
    manualRank: number | null;
    deferCount: number;
    note: string | null;
  };

  export type QueueSnapshotDto = {
    session: {
      id: string;
      title: string;
      status: "draft" | "active" | "closed";
      version: number;
      openedAt: string | null;
      closedAt: string | null;
      timezone: string;
    } | null;
    queueVersion: number | null;
    channels: RequestChannelDto[];
    activeChannelSlug: string;
    current: SongRequestDto | null;
    queued: SongRequestDto[];
    archive: SongRequestDto[];
    activeOperators: Array<{
      id: string;
      displayName: string;
      role: "owner" | "host" | "viewer";
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

  export type PublicSongRequestDto = {
    position: number | null;
    rawText: string;
    artist: string | null;
    title: string | null;
    status: "queued" | "current";
  };

  export type PublicQueueSnapshotDto = {
    isOpen: boolean;
    activeChannel: Pick<RequestChannelDto, "color">;
    current: PublicSongRequestDto | null;
    queued: PublicSongRequestDto[];
    stats: {
      queuedCount: number;
      hasCurrent: boolean;
    };
    updatedAt: string;
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
}

declare module "@karaoke/ui" {
  import type { PropsWithChildren, ReactNode } from "react";

  export function SectionCard(props: PropsWithChildren<{ title: string; actions?: ReactNode }>): JSX.Element;
  export function StatTile(props: { label: string; value: string | number }): JSX.Element;
}
