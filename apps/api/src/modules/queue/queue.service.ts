import {
  BadRequestException,
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
    private readonly settingsService: SettingsService
  ) {}

  async getSnapshot(): Promise<QueueSnapshotDto> {
    const session = await this.sessionsService.getActiveSession();
    if (!session) {
      return {
        session: null,
        current: null,
        queued: [],
        archive: [],
        stats: {
          totalRequests: 0,
          totalSung: 0,
          totalCancelled: 0,
          averageWaitMinutes: 0
        }
      };
    }

    const requests = await this.prisma.songRequest.findMany({
      where: { sessionId: session.id },
      include: { guestProfile: true },
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

    const aggregated = await this.getAggregatedStats(session.id);

    return {
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        openedAt: session.openedAt?.toISOString() ?? null,
        closedAt: session.closedAt?.toISOString() ?? null,
        timezone: session.timezone
      },
      current: current ? toSongRequestDto(current) : null,
      queued: queued.map(toSongRequestDto),
      archive: archive.map(toSongRequestDto),
      stats: aggregated
    };
  }

  async moveRequest(requestId: string, targetPosition: number, actorStaffId: string) {
    const session = await this.sessionsService.getRequiredActiveSession();

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);

      const request = await tx.songRequest.findUnique({ where: { id: requestId } });
      if (!request || request.sessionId !== session.id || request.status !== SongRequestStatus.queued) {
        throw new NotFoundException("Queued request not found");
      }

      const snapshots = await this.snapshotQueuedRequests(session.id, tx);

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
            targetPosition
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot();
  }

  async deferRequest(
    requestId: string,
    actorStaffId: string,
    positionsOverride?: number
  ) {
    const session = await this.sessionsService.getRequiredActiveSession();
    const settings = (session.configSnapshotJson ??
      (await this.settingsService.getGlobalSettings())) as Awaited<
      ReturnType<SettingsService["getGlobalSettings"]>
    >;

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);

      const queued = await tx.songRequest.findMany({
        where: {
          sessionId: session.id,
          status: SongRequestStatus.queued
        },
        orderBy: { queueRank: "asc" }
      });
      const request = queued.find((item) => item.id === requestId);
      if (!request) {
        throw new NotFoundException("Queued request not found");
      }

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
            targetRank
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot();
  }

  async rebalanceQueue(actorStaffId: string) {
    const session = await this.sessionsService.getRequiredActiveSession();
    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      const snapshots = await this.snapshotQueuedRequests(session.id, tx);

      await tx.songRequest.updateMany({
        where: {
          sessionId: session.id,
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
          payloadJson: { clearedPins: true },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot();
  }

  async moveToNextPerformer(actorStaffId: string) {
    const session = await this.sessionsService.getRequiredActiveSession();

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);

      const current = await tx.songRequest.findFirst({
        where: {
          sessionId: session.id,
          status: SongRequestStatus.current
        }
      });
      const next = await tx.songRequest.findFirst({
        where: {
          sessionId: session.id,
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
            toCurrentId: next?.id ?? null
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot();
  }

  async callRequest(requestId: string, actorStaffId: string) {
    const session = await this.sessionsService.getRequiredActiveSession();

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);

      const current = await tx.songRequest.findFirst({
        where: {
          sessionId: session.id,
          status: SongRequestStatus.current
        }
      });
      const request = await tx.songRequest.findUnique({
        where: { id: requestId }
      });

      if (!request || request.sessionId !== session.id || request.status !== SongRequestStatus.queued) {
        throw new NotFoundException("Queued request not found");
      }

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
            toCurrentId: request.id
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );
    });

    return this.getSnapshot();
  }

  async cancelGuestFutureRequests(guestId: string, actorStaffId: string) {
    const session = await this.sessionsService.getRequiredActiveSession();

    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);

      const affected = await tx.songRequest.findMany({
        where: {
          sessionId: session.id,
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
            affectedRequestIds: affected.map((request) => request.id)
          },
          inversePayloadJson: {
            requestSnapshots: snapshots
          },
          isUndoable: true
        },
        tx
      );

    });

    return this.getSnapshot();
  }

  async undoLastAction(actorStaffId: string) {
    const session = await this.sessionsService.getRequiredActiveSession();
    await this.prisma.$transaction(async (tx) => {
      await this.prisma.acquireSessionLock(session.id, tx);
      const lastAction = await this.auditService.getLastUndoableAction(session.id, tx);
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
            originalActionId: lastAction.id
          }
        },
        tx
      );
      await this.auditService.markUndone(lastAction.id, undoAction.id, tx);

    });

    return this.getSnapshot();
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

    const queuePlan = buildQueuePlan(
      queuedRequests.map((request) => ({
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

    const queuePlanMap = new Map(queuePlan.map((item) => [item.id, item]));
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
  }

  private async getAggregatedStats(sessionId: string) {
    const requests = await this.prisma.songRequest.findMany({
      where: { sessionId }
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

  private async snapshotQueuedRequests(sessionId: string, tx: Prisma.TransactionClient) {
    const queued = await tx.songRequest.findMany({
      where: {
        sessionId,
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
}
