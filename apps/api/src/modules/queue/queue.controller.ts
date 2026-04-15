import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { DeferRequestDto, MoveRequestDto } from "./queue.dto.js";
import { QueueService } from "./queue.service.js";

@Controller("queue")
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Roles("viewer", "host", "owner")
  @Get("snapshot")
  async getSnapshot() {
    return this.queueService.getSnapshot();
  }

  @Roles("host", "owner")
  @Post("next")
  async moveToNextPerformer(@CurrentUser() user: AuthenticatedUser) {
    return this.queueService.moveToNextPerformer(user.id);
  }

  @Roles("host", "owner")
  @Post("rebalance")
  async rebalanceQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.queueService.rebalanceQueue(user.id);
  }

  @Roles("host", "owner")
  @Post(":requestId/move")
  async moveRequest(
    @Param("requestId") requestId: string,
    @Body() body: MoveRequestDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.moveRequest(requestId, body.position, user.id);
  }

  @Roles("host", "owner")
  @Post(":requestId/call")
  async callRequest(
    @Param("requestId") requestId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.callRequest(requestId, user.id);
  }

  @Roles("host", "owner")
  @Post(":requestId/defer")
  async deferRequest(
    @Param("requestId") requestId: string,
    @Body() body: DeferRequestDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.deferRequest(requestId, user.id, body.positions);
  }

  @Roles("host", "owner")
  @Post("guest/:guestId/cancel-future")
  async cancelGuestFutureRequests(
    @Param("guestId") guestId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.cancelGuestFutureRequests(guestId, user.id);
  }

  @Roles("host", "owner")
  @Post("undo")
  async undo(@CurrentUser() user: AuthenticatedUser) {
    return this.queueService.undoLastAction(user.id);
  }
}
