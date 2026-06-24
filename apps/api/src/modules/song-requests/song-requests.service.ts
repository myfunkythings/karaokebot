import { Injectable, NotFoundException } from "@nestjs/common";
import { SongRequestStatus } from "@prisma/client";
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

      return {
        status: "accepted" as const,
        message: settings.botReplyTemplates.requestAccepted,
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
      return settings.botReplyTemplates.statusCurrentPerformer;
    }

    const nextRequest = await this.prisma.songRequest.findFirst({
      where: {
        sessionId: session.id,
        guestProfileId: guest.id,
        channelId: channel.id,
        status: SongRequestStatus.queued
      },
      orderBy: { queueRank: "asc" }
    });

    if (!nextRequest) {
      return settings.botReplyTemplates.statusNoActiveRequests;
    }

    const position = nextRequest.queueRank ?? 0;
    const title = nextRequest.title ?? nextRequest.rawText;

    return this.renderTemplate(settings.botReplyTemplates.statusQueuedSummary, {
      title,
      position: String(position)
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

  private renderTemplate(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce(
      (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
      template
    );
  }
}
