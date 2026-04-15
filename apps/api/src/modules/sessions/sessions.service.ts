import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { SessionStatus, SongRequestOutcome, SongRequestStatus } from "@prisma/client";
import type { SessionSummary } from "@karaoke/contracts";
import { PrismaService } from "../../common/db/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { AuditService } from "../audit/audit.service.js";

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService
  ) {}

  async getActiveSession() {
    return this.prisma.session.findFirst({
      where: { status: SessionStatus.active },
      orderBy: { openedAt: "desc" }
    });
  }

  async getRequiredActiveSession() {
    const session = await this.getActiveSession();
    if (!session) {
      throw new NotFoundException("No active session");
    }
    return session;
  }

  async getActiveSessionSummary(): Promise<SessionSummary | null> {
    const session = await this.getActiveSession();
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      title: session.title,
      status: session.status,
      openedAt: session.openedAt?.toISOString() ?? null,
      closedAt: session.closedAt?.toISOString() ?? null,
      timezone: session.timezone
    };
  }

  async openSession(params: {
    title?: string;
    timezone?: string;
    createdByStaffId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireGlobalLock("karaoke-active-session", tx);
      const existing = await tx.session.findFirst({
        where: { status: SessionStatus.active }
      });
      if (existing) {
        throw new BadRequestException("An active session already exists");
      }

      const snapshot = await this.settingsService.snapshotGlobalSettings();
      const now = new Date();
      const session = await tx.session.create({
        data: {
          title:
            params.title?.trim() ||
            `Karaoke Night ${now.toLocaleDateString("ru-RU")}`,
          status: SessionStatus.active,
          openedAt: now,
          timezone: params.timezone ?? "Europe/Moscow",
          configSnapshotJson: snapshot,
          createdByStaffId: params.createdByStaffId
        }
      });

      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId: params.createdByStaffId,
          actionType: "session_opened",
          payloadJson: {
            sessionId: session.id,
            title: session.title
          }
        },
        tx
      );

      return session;
    });
  }

  async closeActiveSession(closedByStaffId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireGlobalLock("karaoke-active-session", tx);
      const session = await tx.session.findFirst({
        where: { status: SessionStatus.active }
      });
      if (!session) {
        throw new NotFoundException("No active session");
      }

      const now = new Date();
      await tx.songRequest.updateMany({
        where: {
          sessionId: session.id,
          status: {
            in: [SongRequestStatus.queued, SongRequestStatus.current]
          }
        },
        data: {
          status: SongRequestStatus.cancelled,
          outcome: SongRequestOutcome.cancelled_by_host,
          cancelledAt: now,
          queueRank: null,
          manualRank: null,
          orderMode: "auto"
        }
      });

      const updated = await tx.session.update({
        where: { id: session.id },
        data: {
          status: SessionStatus.closed,
          closedAt: now
        }
      });

      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId: closedByStaffId,
          actionType: "session_closed",
          payloadJson: {
            sessionId: session.id
          }
        },
        tx
      );

      return updated;
    });
  }
}
