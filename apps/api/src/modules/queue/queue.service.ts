import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  OrderMode,
  Prisma,
  SongRequestOutcome,
  SongRequestStatus
} from "@prisma/client";
import type { QueueSnapshotDto } from "@karaoke/contracts";
import { PrismaService } from "../../common/db/prisma.service.js";
import { toSongRequestDto } from "../../common/utils/song-request.mapper.js";
import { AuditService } from "../audit/audit.service.js";
import { SessionsService } from "../sessions/sessions.service.js";
import { buildQueuePlan } from "./queue-order.js";
import { SettingsService } from "../settings/settings.service.js";
import { RequestChannelsService } from "../request-channels/request-channels.service.js";

type RequestSnapshot = {
  id: string;
  status: SongRequestStatus;
  outcome: SongRequestOutcome | null;
  calledAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  queueRank: number | null;
  orderMode: OrderMode;
  manualRank: number | null;
  deferCount: number;
  note: string | null;
};

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly sessionsService: SessionsService,
    private readonly settingsService: SettingsService,
    private readonly requestChannelsService: RequestChannelsService
  ) {}

  async getSnapshot(
    channelSlug?: string | null,
    actorStaffId?: string
  ): Promise<QueueSnapshotDto> {
    const channels = await this.requestChannelsService.getActiveChannels();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);
    const session = await this.sessionsService.getActiveSession();
    if (actorStaffId) {
      await this.touchPresence(actorStaffId);
    }

    if (!session) {
      return {
        session: null,
        queueVersion: null,
        channels: channels.map(this.toRequestChannelDto),
        activeChannelSlug: channel.slug,
        current: null,
        queued: [],
        archive: [],
        activeOperators: await this.getActiveOperators(),
        recentActions: [],
        stats: {
          totalRequests: 0,
          totalSung: 0,
          totalCancelled: 0,
          averageWaitMinutes: 0
        }
      };
    }

    const requests = await this.prisma.songRequest.findMany({
      where: { sessionId: session.id, channelId: channel.id },
      include: { guestProfile: true, channel: true },
      orderBy: [{ queueRank: "asc" }, { requestedAt: "asc" }]
    });

    const current = requests.find((request) => request.status === SongRequestStatus.current) ?? null;
    const queued = requests.filter((request) => request.status === SongRequestStatus.queued);
    const archive = requests
      .filter(
        (request) =>
          request.status === SongRequestStatus.sung ||
          request.status === SongRequestStatus.cancelled
      )
      .sort((left, right) => {
        const leftAt =
          left.completedAt?.getTime() ?? left.cancelledAt?.getTime() ?? left.requestedAt.getTime();
        const rightAt =
          right.completedAt?.getTime() ??
          right.cancelledAt?.getTime() ??
          right.requestedAt.getTime();
        return rightAt - leftAt;
      });

    const aggregated = await this.getAggregatedStats(session.id, channel.id);

    return {
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        version: session.version,
        openedAt: session.openedAt?.toISOString() ?? null,
        closedAt: session.closedAt?.toISOString() ?? null,
        timezone: session.timezone
      },
      queueVersion: session.version,
      channels: channels.map(this.toRequestChannelDto),
      activeChannelSlug: channel.slug,
      current: current ? toSongRequestDto(current) : null,
      queued: queued.map(toSongRequestDto),
      archive: archive.map(toSongRequestDto),
      activeOperators: await this.getActiveOperators(),
      recentActions: await this.getRecentActions(session.id, channel.slug),
      stats: aggregated
    };
  }

  async moveRequest(
    requestId: string,
    targetPosition: number,
    actorStaffId: string,
    expectedQueueVersion: number
  ) {
    const session = await this.sessionsService.getRequiredActiveSession();
    let changedChannelSlug: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      await this.assertExpectedQueueVersion(session.id, expectedQueueVersion, tx);

      const request = await tx.songRequest.findUnique({
        where: { id: requestId },
        include: { channel: true }
      });
      if (!request || request.sessionId !== session.id || request.status !== SongRequestStatus.queued) {
        throw new NotFoundException("Queued request not found");
      }
      changedChannelSlug = request.channel.slug;

      const snapshots = await this.snapshotQueuedRequests(session.id, tx, request.channelId);

      await tx.songRequest.update({
        where: { id: requestId },
        data: {
          orderMode: OrderMode.manual_pin,
          manualRank: targetPosition
        }
      });

      await this.refreshSessionDerivedState(session.id, tx);

      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId,
          actionType: "queue_reordered",
          payloadJson: {
            requestId,
            targetPosition,
            channelId: request.channelId,
            channelSlug: request.channel.slug
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot(changedChannelSlug, actorStaffId);
  }

  async deferRequest(
    requestId: string,
    actorStaffId: string,
    expectedQueueVersion: number,
    positionsOverride?: number
  ) {
    const session = await this.sessionsService.getRequiredActiveSession();
    let changedChannelSlug: string | null = null;
    const settings = (session.configSnapshotJson ??
      (await this.settingsService.getGlobalSettings())) as Awaited<
      ReturnType<SettingsService["getGlobalSettings"]>
    >;

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      await this.assertExpectedQueueVersion(session.id, expectedQueueVersion, tx);

      const request = await tx.songRequest.findUnique({
        where: { id: requestId },
        include: { channel: true }
      });
      if (!request || request.sessionId !== session.id || request.status !== SongRequestStatus.queued) {
        throw new NotFoundException("Queued request not found");
      }
      changedChannelSlug = request.channel.slug;

      const queued = await tx.songRequest.findMany({
        where: {
          sessionId: session.id,
          channelId: request.channelId,
          status: SongRequestStatus.queued
        },
        orderBy: { queueRank: "asc" }
      });

      const snapshots = this.toRequestSnapshots(queued);
      const currentRank = request.queueRank ?? queued.findIndex((item) => item.id === requestId) + 1;
      const targetRank = currentRank + (positionsOverride ?? settings.skipDownPositions);

      await tx.songRequest.update({
        where: { id: requestId },
        data: {
          orderMode: OrderMode.manual_pin,
          manualRank: targetRank,
          deferCount: {
            increment: 1
          }
        }
      });

      await this.refreshSessionDerivedState(session.id, tx);

      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId,
          actionType: "request_deferred",
          payloadJson: {
            requestId,
            targetRank,
            channelId: request.channelId,
            channelSlug: request.channel.slug
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot(changedChannelSlug, actorStaffId);
  }

  async rebalanceQueue(
    actorStaffId: string,
    expectedQueueVersion: number,
    channelSlug?: string | null
  ) {
    const session = await this.sessionsService.getRequiredActiveSession();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);
    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      await this.assertExpectedQueueVersion(session.id, expectedQueueVersion, tx);
      const snapshots = await this.snapshotQueuedRequests(session.id, tx, channel.id);

      await tx.songRequest.updateMany({
        where: {
          sessionId: session.id,
          channelId: channel.id,
          status: SongRequestStatus.queued
        },
        data: {
          orderMode: OrderMode.auto,
          manualRank: null
        }
      });
      await this.refreshSessionDerivedState(session.id, tx);

      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId,
          actionType: "queue_rebalanced",
          payloadJson: { clearedPins: true, channelId: channel.id, channelSlug: channel.slug },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot(channel.slug, actorStaffId);
  }

  async moveToNextPerformer(
    actorStaffId: string,
    expectedQueueVersion: number,
    channelSlug?: string | null
  ) {
    const session = await this.sessionsService.getRequiredActiveSession();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      await this.assertExpectedQueueVersion(session.id, expectedQueueVersion, tx);

      const current = await tx.songRequest.findFirst({
        where: {
          sessionId: session.id,
          channelId: channel.id,
          status: SongRequestStatus.current
        }
      });
      const next = await tx.songRequest.findFirst({
        where: {
          sessionId: session.id,
          channelId: channel.id,
          status: SongRequestStatus.queued
        },
        orderBy: { queueRank: "asc" }
      });

      if (!current && !next) {
        throw new BadRequestException("Queue is empty");
      }

      const snapshots = this.toRequestSnapshots(
        [current, next].filter(Boolean) as NonNullable<typeof current>[]
      );
      const now = new Date();

      if (current) {
        await tx.songRequest.update({
          where: { id: current.id },
          data: {
            status: SongRequestStatus.sung,
            outcome: SongRequestOutcome.sung,
            completedAt: now,
            queueRank: null,
            orderMode: OrderMode.auto,
            manualRank: null
          }
        });
      }

      if (next) {
        await tx.songRequest.update({
          where: { id: next.id },
          data: {
            status: SongRequestStatus.current,
            calledAt: now,
            queueRank: null
          }
        });
      }

      await this.refreshSessionDerivedState(session.id, tx);

      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId,
          actionType: "next_performer",
          payloadJson: {
            fromCurrentId: current?.id ?? null,
            toCurrentId: next?.id ?? null,
            channelId: channel.id,
            channelSlug: channel.slug
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot(channel.slug, actorStaffId);
  }

  async callRequest(
    requestId: string,
    actorStaffId: string,
    expectedQueueVersion: number
  ) {
    const session = await this.sessionsService.getRequiredActiveSession();
    let changedChannelSlug: string | null = null;

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      await this.assertExpectedQueueVersion(session.id, expectedQueueVersion, tx);

      const request = await tx.songRequest.findUnique({
        where: { id: requestId },
        include: { channel: true }
      });

      if (!request || request.sessionId !== session.id || request.status !== SongRequestStatus.queued) {
        throw new NotFoundException("Queued request not found");
      }
      changedChannelSlug = request.channel.slug;
      const current = await tx.songRequest.findFirst({
        where: {
          sessionId: session.id,
          channelId: request.channelId,
          status: SongRequestStatus.current
        }
      });

      const snapshots = this.toRequestSnapshots(
        [current, request].filter(Boolean) as NonNullable<typeof request>[]
      );
      const now = new Date();

      if (current) {
        await tx.songRequest.update({
          where: { id: current.id },
          data: {
            status: SongRequestStatus.sung,
            outcome: SongRequestOutcome.sung,
            completedAt: now,
            queueRank: null,
            orderMode: OrderMode.auto,
            manualRank: null
          }
        });
      }

      await tx.songRequest.update({
        where: { id: request.id },
        data: {
          status: SongRequestStatus.current,
          calledAt: now,
          queueRank: null
        }
      });

      await this.refreshSessionDerivedState(session.id, tx);

      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId,
          actionType: "request_called",
          payloadJson: {
            fromCurrentId: current?.id ?? null,
            toCurrentId: request.id,
            channelId: request.channelId,
            channelSlug: request.channel.slug
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );
    });

    return this.getSnapshot(changedChannelSlug, actorStaffId);
  }

  async cancelGuestFutureRequests(
    guestId: string,
    actorStaffId: string,
    expectedQueueVersion: number,
    channelSlug?: string | null
  ) {
    const session = await this.sessionsService.getRequiredActiveSession();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      await this.assertExpectedQueueVersion(session.id, expectedQueueVersion, tx);

      const affected = await tx.songRequest.findMany({
        where: {
          sessionId: session.id,
          channelId: channel.id,
          guestProfileId: guestId,
          status: {
            in: [SongRequestStatus.queued, SongRequestStatus.current]
          }
        },
        orderBy: { requestedAt: "asc" }
      });

      if (!affected.length) {
        throw new NotFoundException("No active requests found for guest");
      }

      const snapshots = this.toRequestSnapshots(affected);
      const now = new Date();
      await tx.songRequest.updateMany({
        where: {
          id: {
            in: affected.map((request) => request.id)
          }
        },
        data: {
          status: SongRequestStatus.cancelled,
          outcome: SongRequestOutcome.left_venue,
          cancelledAt: now,
          queueRank: null,
          orderMode: OrderMode.auto,
          manualRank: null
        }
      });

      await this.refreshSessionDerivedState(session.id, tx);
      await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId,
          actionType: "guest_left_venue",
          payloadJson: {
            guestId,
            affectedRequestIds: affected.map((request) => request.id),
            channelId: channel.id,
            channelSlug: channel.slug
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot(channel.slug, actorStaffId);
  }

  async undoLastAction(
    actorStaffId: string,
    expectedQueueVersion: number,
    channelSlug?: string | null
  ) {
    const session = await this.sessionsService.getRequiredActiveSession();
    const channel = await this.requestChannelsService.getRequiredChannelBySlug(channelSlug);
    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      await this.assertExpectedQueueVersion(session.id, expectedQueueVersion, tx);
      const lastAction = await this.getLastUndoableActionForChannel(session.id, channel.slug, tx);
      if (!lastAction || !lastAction.inversePayloadJson || lastAction.undoneByActionId) {
        throw new NotFoundException("No undoable action");
      }

      const inversePayload = lastAction.inversePayloadJson as {
        requestSnapshots?: RequestSnapshot[];
      };
      const snapshots = inversePayload.requestSnapshots ?? [];

      for (const snapshot of snapshots) {
        await tx.songRequest.update({
          where: { id: snapshot.id },
          data: {
            status: snapshot.status,
            outcome: snapshot.outcome,
            calledAt: snapshot.calledAt ? new Date(snapshot.calledAt) : null,
            completedAt: snapshot.completedAt ? new Date(snapshot.completedAt) : null,
            cancelledAt: snapshot.cancelledAt ? new Date(snapshot.cancelledAt) : null,
            queueRank: snapshot.queueRank,
            orderMode: snapshot.orderMode,
            manualRank: snapshot.manualRank,
            deferCount: snapshot.deferCount,
            note: snapshot.note
          }
        });
      }

      await this.refreshSessionDerivedState(session.id, tx);

      const undoAction = await this.auditService.recordAction(
        {
          sessionId: session.id,
          actorType: "staff",
          actorStaffId,
          actionType: "undo",
          payloadJson: {
            originalActionId: lastAction.id,
            channelSlug: channel.slug
          }
        },
        tx
      );
      await this.auditService.markUndone(lastAction.id, undoAction.id, tx);

    });

    return this.getSnapshot(channel.slug, actorStaffId);
  }

  async refreshSessionDerivedState(
    sessionId: string,
    tx: Prisma.TransactionClient = this.prisma
  ) {
    const session = await tx.session.findUnique({
      where: { id: sessionId }
    });
    if (!session) {
      throw new NotFoundException("Session not found");
    }

    const requests = await tx.songRequest.findMany({
      where: { sessionId },
      orderBy: [{ requestedAt: "asc" }, { id: "asc" }]
    });

    const statsMap = new Map<
      string,
      {
        sessionId: string;
        guestProfileId: string;
        requestsCount: number;
        sungCount: number;
        deferCount: number;
        cancelledCount: number;
        lastRequestAt: Date | null;
      }
    >();

    for (const request of requests) {
      const existing = statsMap.get(request.guestProfileId) ?? {
        sessionId,
        guestProfileId: request.guestProfileId,
        requestsCount: 0,
        sungCount: 0,
        deferCount: 0,
        cancelledCount: 0,
        lastRequestAt: null
      };

      existing.requestsCount += 1;
      if (request.status === SongRequestStatus.sung) {
        existing.sungCount += 1;
      }
      if (request.status === SongRequestStatus.cancelled) {
        existing.cancelledCount += 1;
      }
      existing.deferCount += request.deferCount;
      existing.lastRequestAt =
        !existing.lastRequestAt || existing.lastRequestAt < request.requestedAt
          ? request.requestedAt
          : existing.lastRequestAt;

      statsMap.set(request.guestProfileId, existing);
    }

    await tx.sessionGuestStat.deleteMany({ where: { sessionId } });
    if (statsMap.size) {
      await tx.sessionGuestStat.createMany({
        data: [...statsMap.values()]
      });
    }

    const queuedRequests = requests.filter(
      (request) => request.status === SongRequestStatus.queued
    );
    const flags = (
      session.configSnapshotJson as {
        queuePolicyFlags?: {
          prioritizeFirstTimeSinger: boolean;
          prioritizeLowerSungCount: boolean;
          prioritizeRequestTime: boolean;
        };
      }
    ).queuePolicyFlags ?? {
      prioritizeFirstTimeSinger: true,
      prioritizeLowerSungCount: true,
      prioritizeRequestTime: true
    };

    const queuePlanMap = new Map<
      string,
      { queueRank: number; orderMode: OrderMode; manualRank: number | null }
    >();
    const channelIds = [...new Set(queuedRequests.map((request) => request.channelId))];
    for (const channelId of channelIds) {
      const channelQueuedRequests = queuedRequests.filter(
        (request) => request.channelId === channelId
      );
      const queuePlan = buildQueuePlan(
        channelQueuedRequests.map((request) => ({
          id: request.id,
          guestProfileId: request.guestProfileId,
          requestedAt: request.requestedAt,
          orderMode: request.orderMode,
          manualRank: request.manualRank
        })),
        new Map(
          [...statsMap.values()].map((item) => [item.guestProfileId, { sungCount: item.sungCount }])
        ),
        flags
      );
      for (const item of queuePlan) {
        queuePlanMap.set(item.id, item);
      }
    }
    for (const request of queuedRequests) {
      const planned = queuePlanMap.get(request.id);
      await tx.songRequest.update({
        where: { id: request.id },
        data: {
          queueRank: planned?.queueRank ?? null,
          orderMode: planned?.orderMode ?? OrderMode.auto,
          manualRank: planned?.manualRank ?? null
        }
      });
    }

    await tx.songRequest.updateMany({
      where: {
        sessionId,
        status: {
          in: [SongRequestStatus.sung, SongRequestStatus.cancelled, SongRequestStatus.current]
        }
      },
      data: {
        queueRank: null
      }
    });

    await tx.session.update({
      where: { id: sessionId },
      data: {
        version: {
          increment: 1
        }
      }
    });
  }

  async bumpQueueVersion(
    sessionId: string,
    tx: Prisma.TransactionClient = this.prisma
  ) {
    await tx.session.update({
      where: { id: sessionId },
      data: {
        version: {
          increment: 1
        }
      }
    });
  }

  private async assertExpectedQueueVersion(
    sessionId: string,
    expectedQueueVersion: number,
    tx: Prisma.TransactionClient
  ) {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      select: { version: true }
    });
    if (!session) {
      throw new NotFoundException("Session not found");
    }
    if (session.version !== expectedQueueVersion) {
      throw new ConflictException(
        "Очередь уже изменилась на другом устройстве. Обновите экран и повторите действие."
      );
    }
  }

  private async touchPresence(staffUserId: string) {
    await this.prisma.staffPresence.upsert({
      where: { staffUserId },
      update: { lastSeenAt: new Date() },
      create: { staffUserId }
    });
  }

  private async getLastUndoableActionForChannel(
    sessionId: string,
    channelSlug: string,
    tx: Prisma.TransactionClient = this.prisma
  ) {
    const actions = await tx.actionLog.findMany({
      where: {
        sessionId,
        isUndoable: true,
        undoneByActionId: null
      },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    return actions.find((action) => {
      const payload = action.payloadJson as { channelSlug?: string };
      return payload.channelSlug === channelSlug;
    }) ?? null;
  }

  private async getActiveOperators() {
    const since = new Date(Date.now() - 1000 * 60 * 2);
    const rows = await this.prisma.staffPresence.findMany({
      where: {
        lastSeenAt: {
          gte: since
        },
        staffUser: {
          isActive: true
        }
      },
      include: {
        staffUser: true
      },
      orderBy: {
        lastSeenAt: "desc"
      }
    });

    return rows.map((row) => ({
      id: row.staffUser.id,
      displayName: row.staffUser.displayName,
      role: row.staffUser.role,
      lastSeenAt: row.lastSeenAt.toISOString()
    }));
  }

  private async getRecentActions(sessionId: string, channelSlug: string) {
    const actions = await this.prisma.actionLog.findMany({
      where: { sessionId },
      include: {
        actorStaff: true
      },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    return actions
      .filter((action) => {
        const payload = action.payloadJson as { channelSlug?: string };
        return !payload.channelSlug || payload.channelSlug === channelSlug;
      })
      .slice(0, 8)
      .map((action) => ({
        id: action.id,
        actorDisplayName:
          action.actorStaff?.displayName ??
          (action.actorType === "telegram" ? "Telegram" : "Система"),
        actionType: action.actionType,
        label: this.getActionLabel(action.actionType),
        createdAt: action.createdAt.toISOString()
      }));
  }

  private getActionLabel(actionType: string) {
    const labels: Record<string, string> = {
      guest_left_venue: "снял заявки гостя",
      manual_request_created: "добавил заявку вручную",
      next_performer: "вызвал следующего исполнителя",
      queue_rebalanced: "вернул автоочередь",
      queue_reordered: "переставил заявку",
      request_called: "вызвал заявку",
      request_deferred: "отложил заявку",
      request_raw_text_updated: "изменил текст заявки",
      session_closed: "закрыл смену",
      session_opened: "открыл смену",
      telegram_guest_queued_requests_cancelled: "удалил свои заявки из Telegram",
      telegram_request_created: "принял заявку из Telegram",
      undo: "отменил последнее действие"
    };

    return labels[actionType] ?? actionType;
  }

  private async getAggregatedStats(sessionId: string, channelId: string) {
    const requests = await this.prisma.songRequest.findMany({
      where: { sessionId, channelId }
    });
    const totalRequests = requests.length;
    const totalSung = requests.filter((request) => request.status === SongRequestStatus.sung).length;
    const totalCancelled = requests.filter(
      (request) => request.status === SongRequestStatus.cancelled
    ).length;
    const waitTimes = requests
      .filter((request) => request.completedAt)
      .map((request) => {
        const completedAt = request.completedAt ?? request.requestedAt;
        return (completedAt.getTime() - request.requestedAt.getTime()) / 1000 / 60;
      });

    const averageWaitMinutes = waitTimes.length
      ? Math.round(
          (waitTimes.reduce((total, value) => total + value, 0) / waitTimes.length) * 10
        ) / 10
      : 0;

    return {
      totalRequests,
      totalSung,
      totalCancelled,
      averageWaitMinutes
    };
  }

  private async snapshotQueuedRequests(
    sessionId: string,
    tx: Prisma.TransactionClient,
    channelId: string
  ) {
    const queued = await tx.songRequest.findMany({
      where: {
        sessionId,
        channelId,
        status: SongRequestStatus.queued
      },
      orderBy: { queueRank: "asc" }
    });
    return this.toRequestSnapshots(queued);
  }

  private toRequestSnapshots(
    requests: Array<{
      id: string;
      status: SongRequestStatus;
      outcome: SongRequestOutcome | null;
      calledAt: Date | null;
      completedAt: Date | null;
      cancelledAt: Date | null;
      queueRank: number | null;
      orderMode: OrderMode;
      manualRank: number | null;
      deferCount: number;
      note: string | null;
    }>
  ): RequestSnapshot[] {
    return requests.map((request) => ({
      id: request.id,
      status: request.status,
      outcome: request.outcome,
      calledAt: request.calledAt?.toISOString() ?? null,
      completedAt: request.completedAt?.toISOString() ?? null,
      cancelledAt: request.cancelledAt?.toISOString() ?? null,
      queueRank: request.queueRank,
      orderMode: request.orderMode,
      manualRank: request.manualRank,
      deferCount: request.deferCount,
      note: request.note
    }));
  }

  private toRequestChannelDto(channel: {
    id: string;
    slug: string;
    name: string;
    color: string | null;
  }) {
    return {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      color: channel.color
    };
  }
}
