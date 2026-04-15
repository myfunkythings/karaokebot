import { Injectable } from "@nestjs/common";
import { Prisma, type ActorType } from "@prisma/client";
import { PrismaService } from "../../common/db/prisma.service.js";

type ActionLogInput = {
  sessionId: string;
  actorType: ActorType;
  actorStaffId?: string | null;
  actorGuestId?: string | null;
  actionType: string;
  payloadJson: Prisma.InputJsonValue;
  inversePayloadJson?: Prisma.InputJsonValue | null;
  isUndoable?: boolean;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAction(
    input: ActionLogInput,
    tx: Prisma.TransactionClient = this.prisma
  ) {
    return tx.actionLog.create({
      data: {
        sessionId: input.sessionId,
        actorType: input.actorType,
        actorStaffId: input.actorStaffId ?? null,
        actorGuestId: input.actorGuestId ?? null,
        actionType: input.actionType,
        payloadJson: input.payloadJson,
        inversePayloadJson: input.inversePayloadJson ?? Prisma.JsonNull,
        isUndoable: input.isUndoable ?? false
      }
    });
  }

  async getLastUndoableAction(sessionId: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.actionLog.findFirst({
      where: {
        sessionId,
        isUndoable: true,
        undoneByActionId: null
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async markUndone(
    originalActionId: string,
    undoActionId: string,
    tx: Prisma.TransactionClient = this.prisma
  ) {
    await tx.actionLog.update({
      where: { id: originalActionId },
      data: { undoneByActionId: undoActionId }
    });
  }
}
