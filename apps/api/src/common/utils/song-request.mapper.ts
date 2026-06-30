import type { SongRequest, GuestProfile, RequestChannel } from "@prisma/client";
import type { PublicSongRequestDto, SongRequestDto } from "@karaoke/contracts";

type SongRequestWithGuest = SongRequest & {
  guestProfile: GuestProfile;
  channel: RequestChannel;
};

export function toSongRequestDto(request: SongRequestWithGuest): SongRequestDto {
  return {
    id: request.id,
    sessionId: request.sessionId,
    channel: {
      id: request.channel.id,
      slug: request.channel.slug,
      name: request.channel.name,
      color: request.channel.color
    },
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

type PublicSongRequest = Pick<SongRequest, "rawText" | "artist" | "title" | "status">;

export function toPublicSongRequestDto(
  request: PublicSongRequest,
  position: number | null
): PublicSongRequestDto {
  return {
    position,
    rawText: request.rawText,
    artist: request.artist,
    title: request.title,
    status: request.status === "current" ? "current" : "queued"
  };
}
