import { Injectable, NotFoundException } from "@nestjs/common";
import { OrderMode, SongRequestOutcome, SongRequestStatus } from "@prisma/client";
import { PrismaService } from "../../common/db/prisma.service.js";
import { parseSongRequest } from "../../common/utils/parse-song-request.js";
import { toSongRequestDto } from "../../common/utils/song-request.mapper.js";
import { GuestsService } from "../guests/guests.service.js";
import { SessionsService } from "../sessions/sessions.service.js";
import { QueueService } from "../queue/queue.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { AuditService } from "../audit/audit.service.js";
import { RequestChannelsService } from "../request-channels/request-channels.service.js";

type TelegramCreateResult =
  | {
      status: "accepted";
      message: string;
      requestId: string;
      guestProfileId: string;
    }
  | {
      status: "ignored";
      message: string;
      guestProfileId: string | null;
    };

@Injectable()
export class SongRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guestsService: GuestsService,
    private readonly sessionsService: SessionsService,
    private readonly queueService: QueueService,
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
    private readonly requestChannelsService: RequestChannelsService
  ) {}

  async createManualRequest(input: {
    displayName: string;
    rawText: string;
    artist?: string | null;
    title?: string | null;
    actorStaffId: string;
    channelSlug?: string | null;
  }) {
    const session = await this.sessionsService.getRequiredActiveSession();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(
      input.channelSlug
    );

    return this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      const guest = await this.guestsService.findOrCreateManualGuest(input.displayName);
      const parsed = parseSongRequest(input.rawText);
      const request = await tx.songRequest.create({
        data: {
          sessionId: session.id,
          guestProfileId: guest.id,
          channelId: channel.id,
          source: "manual",
          rawText: input.rawText.trim(),
          artist: input.artist?.trim() || parsed.artist,
          title: input.title?.trim() || parsed.title
        },
        include: {
          guestProfile: true,
          channel: true
        }
      });

      await this.queueService.refreshSessionDerivedState(session.id, tx);
      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId: input.actorStaffId,
          actionType: "manual_request_created",
          payloadJson: {
            requestId: request.id,
            guestProfileId: guest.id,
            channelId: channel.id,
            channelSlug: channel.slug
          }
        },
        tx
      );

      return toSongRequestDto(request);
    });
  }

  async createTelegramRequest(input: {
    telegramUpdateId: string;
    telegramChatId: string;
    telegramMessageId?: string | null;
    telegramUserId: string;
    telegramUsername?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    rawText: string;
    channelSlug?: string | null;
  }): Promise<TelegramCreateResult> {
    const session = await this.sessionsService.getActiveSession();
    const settings = await this.settingsService.getGlobalSettings();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(
      input.channelSlug
    );
    const guest = await this.guestsService.upsertTelegramGuest({
      telegramUserId: input.telegramUserId,
      telegramUsername: input.telegramUsername,
      firstName: input.firstName,
      lastName: input.lastName
    });

    if (!session) {
      return {
        status: "ignored",
        guestProfileId: guest.id,
        message: settings.botReplyTemplates.requestRejectedNoSession
      };
    }

    return this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      const latestRequest = await tx.songRequest.findFirst({
        where: {
          guestProfileId: guest.id,
          channelId: channel.id
        },
        orderBy: { requestedAt: "desc" }
      });

      if (
        latestRequest &&
        Date.now() - latestRequest.requestedAt.getTime() <
          settings.antiSpamSeconds * 1000
      ) {
        return {
          status: "ignored" as const,
          message: settings.botReplyTemplates.requestRejectedRateLimit,
          guestProfileId: guest.id
        };
      }

      const parsed = parseSongRequest(input.rawText);
      const request = await tx.songRequest.create({
        data: {
          sessionId: session.id,
          guestProfileId: guest.id,
          channelId: channel.id,
          source: "telegram",
          telegramUpdateId: input.telegramUpdateId,
          telegramMessageId: input.telegramMessageId ?? null,
          rawText: parsed.rawText,
          artist: parsed.artist,
          title: parsed.title
        }
      });

      await this.queueService.refreshSessionDerivedState(session.id, tx);
      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "telegram",
          actorGuestId: guest.id,
          actionType: "telegram_request_created",
          payloadJson: {
            requestId: request.id,
            parseConfidence: parsed.parseConfidence,
            channelId: channel.id,
            channelSlug: channel.slug
          }
        },
        tx
      );

      const updatedRequest = await tx.songRequest.findUnique({
        where: { id: request.id },
        select: {
          queueRank: true,
          title: true,
          rawText: true
        }
      });
      const title = updatedRequest?.title ?? updatedRequest?.rawText ?? request.rawText;
      const position = updatedRequest?.queueRank ?? 0;

      return {
        status: "accepted" as const,
        message: this.renderTemplate(settings.botReplyTemplates.requestAccepted, {
          title,
          position: String(position)
        }),
        requestId: request.id,
        guestProfileId: guest.id
      };
    });
  }

  async updateRequestRawText(input: {
    requestId: string;
    rawText: string;
    actorStaffId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existingRequest = await tx.songRequest.findUnique({
        where: { id: input.requestId },
        include: { guestProfile: true, channel: true }
      });

      if (!existingRequest) {
        throw new NotFoundException("Song request not found");
      }

      await this.prisma.acquireSessionLock(existingRequest.sessionId, tx);
      const parsed = parseSongRequest(input.rawText);
      const updatedRequest = await tx.songRequest.update({
        where: { id: input.requestId },
        data: {
          rawText: parsed.rawText,
          artist: parsed.artist,
          title: parsed.title
        },
        include: {
          guestProfile: true,
          channel: true
        }
      });

      await this.auditService.recordAction(
        {
          sessionId: existingRequest.sessionId,
          actorType: "staff",
          actorStaffId: input.actorStaffId,
          actionType: "request_raw_text_updated",
          payloadJson: {
            requestId: existingRequest.id,
            previousRawText: existingRequest.rawText,
            nextRawText: updatedRequest.rawText,
            channelId: existingRequest.channelId,
            channelSlug: existingRequest.channel.slug
          }
        },
        tx
      );
      await this.queueService.bumpQueueVersion(existingRequest.sessionId, tx);

      return toSongRequestDto(updatedRequest);
    });
  }

  async getTelegramGuestStatusSummary(telegramUserId: string, channelSlug?: string | null) {
    const session = await this.sessionsService.getActiveSession();
    const settings = await this.settingsService.getGlobalSettings();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);

    if (!session) {
      return settings.botReplyTemplates.requestRejectedNoSession;
    }

    const guest = await this.prisma.guestProfile.findUnique({
      where: { telegramUserId }
    });
    if (!guest) {
      return settings.botReplyTemplates.statusNoGuestProfile;
    }

    const current = await this.prisma.songRequest.findFirst({
      where: {
        sessionId: session.id,
        guestProfileId: guest.id,
        channelId: channel.id,
        status: SongRequestStatus.current
      }
    });

    if (current) {
      const queuedRequestsForCurrentGuest = await this.getQueuedRequestsForGuest(
        session.id,
        channel.id,
        guest.id
      );

      if (!queuedRequestsForCurrentGuest.length) {
        return settings.botReplyTemplates.statusCurrentPerformer;
      }

      return [
        settings.botReplyTemplates.statusCurrentPerformer,
        "",
        this.formatQueuedRequestsList(queuedRequestsForCurrentGuest, true)
      ].join("\n");
    }

    const activeCurrent = await this.prisma.songRequest.findFirst({
      where: {
        sessionId: session.id,
        channelId: channel.id,
        status: SongRequestStatus.current
      }
    });

    const queuedRequests = await this.prisma.songRequest.findMany({
      where: {
        sessionId: session.id,
        channelId: channel.id,
        status: SongRequestStatus.queued
      },
      orderBy: [{ queueRank: "asc" }, { requestedAt: "asc" }]
    });

    const guestQueuedRequests = queuedRequests.filter(
      (request) => request.guestProfileId === guest.id
    );

    if (!guestQueuedRequests.length) {
      return settings.botReplyTemplates.statusNoActiveRequests;
    }

    return this.formatQueuedRequestsList(guestQueuedRequests, Boolean(activeCurrent));
  }

  async cancelTelegramGuestQueuedRequests(
    telegramUserId: string,
    channelSlug?: string | null
  ) {
    const session = await this.sessionsService.getActiveSession();
    const settings = await this.settingsService.getGlobalSettings();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);

    if (!session) {
      return settings.botReplyTemplates.requestRejectedNoSession;
    }

    const guest = await this.prisma.guestProfile.findUnique({
      where: { telegramUserId }
    });
    if (!guest) {
      return settings.botReplyTemplates.statusNoGuestProfile;
    }

    return this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);

      const queuedRequests = await tx.songRequest.findMany({
        where: {
          sessionId: session.id,
          guestProfileId: guest.id,
          channelId: channel.id,
          status: SongRequestStatus.queued
        },
        orderBy: [{ queueRank: "asc" }, { requestedAt: "asc" }]
      });

      if (!queuedRequests.length) {
        return settings.botReplyTemplates.statusNoActiveRequests;
      }

      const now = new Date();
      await tx.songRequest.updateMany({
        where: {
          id: {
            in: queuedRequests.map((request) => request.id)
          }
        },
        data: {
          status: SongRequestStatus.cancelled,
          outcome: SongRequestOutcome.cancelled_by_host,
          cancelledAt: now,
          queueRank: null,
          orderMode: OrderMode.auto,
          manualRank: null
        }
      });

      await this.queueService.refreshSessionDerivedState(session.id, tx);
      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "telegram",
          actorGuestId: guest.id,
          actionType: "telegram_guest_queued_requests_cancelled",
          payloadJson: {
            guestId: guest.id,
            affectedRequestIds: queuedRequests.map((request) => request.id),
            channelId: channel.id,
            channelSlug: channel.slug
          }
        },
        tx
      );

      return this.formatCancelledRequestsMessage(queuedRequests);
    });
  }

  async getRequestById(requestId: string) {
    const request = await this.prisma.songRequest.findUnique({
      where: { id: requestId },
      include: { guestProfile: true, channel: true }
    });
    if (!request) {
      throw new NotFoundException("Song request not found");
    }

    return toSongRequestDto(request);
  }

  private async getQueuedRequestsForGuest(
    sessionId: string,
    channelId: string,
    guestProfileId: string
  ) {
    return this.prisma.songRequest.findMany({
      where: {
        sessionId,
        channelId,
        guestProfileId,
        status: SongRequestStatus.queued
      },
      orderBy: [{ queueRank: "asc" }, { requestedAt: "asc" }]
    });
  }

  private formatQueuedRequestsList(
    requests: Array<{
      id: string;
      queueRank: number | null;
      title: string | null;
      rawText: string;
    }>,
    hasActiveCurrent = false
  ) {
    const lines = requests.map((request, index) => {
      const position = request.queueRank ?? index + 1;
      const tracksAhead = Math.max(0, position - 1 + (hasActiveCurrent ? 1 : 0));
      const title = request.title ?? request.rawText;

      return `${index + 1}. ${title} — позиция в очереди: ${position}; ${this.formatTracksAhead(
        tracksAhead
      )}.`;
    });

    return ["Твои песни в очереди:", ...lines].join("\n");
  }

  private formatCancelledRequestsMessage(
    requests: Array<{
      title: string | null;
      rawText: string;
    }>
  ) {
    const lines = requests.map((request, index) => {
      const title = request.title ?? request.rawText;
      return `${index + 1}. ${title}`;
    });

    return [
      `Удалил из очереди ${requests.length} ${this.getRequestPlural(requests.length)}:`,
      ...lines
    ].join("\n");
  }

  private formatTracksAhead(tracksAhead: number) {
    if (tracksAhead === 0) {
      return "ты следующий/следующая";
    }

    return `примерно через ${tracksAhead} ${this.getTrackPlural(tracksAhead)}`;
  }

  private getTrackPlural(count: number) {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return "треков";
    }

    if (lastDigit === 1) {
      return "трек";
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return "трека";
    }

    return "треков";
  }

  private getRequestPlural(count: number) {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return "заявок";
    }

    if (lastDigit === 1) {
      return "заявку";
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return "заявки";
    }

    return "заявок";
  }

  private renderTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
      template
    );
  }
}
