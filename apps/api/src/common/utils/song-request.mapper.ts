import type { SongRequest, GuestProfile } from "@prisma/client";
import type { SongRequestDto } from "@karaoke/contracts";

type SongRequestWithGuest = SongRequest & {
  guestProfile: GuestProfile;
};

export function toSongRequestDto(request: SongRequestWithGuest): SongRequestDto {
  return {
    id: request.id,
    sessionId: request.sessionId,
    guest: {
      id: request.guestProfile.id,
      displayName: request.guestProfile.displayName,
      telegramUsername: request.guestProfile.telegramUsername,
      telegramUserId: request.guestProfile.telegramUserId
    },
    rawText: request.rawText,
    artist: request.artist,
    title: request.title,
    source: request.source,
    status: request.status,
    outcome: request.outcome,
    requestedAt: request.requestedAt.toISOString(),
    calledAt: request.calledAt?.toISOString() ?? null,
    completedAt: request.completedAt?.toISOString() ?? null,
    cancelledAt: request.cancelledAt?.toISOString() ?? null,
    queueRank: request.queueRank,
    orderMode: request.orderMode,
    manualRank: request.manualRank,
    deferCount: request.deferCount,
    note: request.note
  };
}
