import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { ChannelScopedQueueVersionDto, DeferRequestDto, MoveRequestDto, QueueVersionDto } from "./queue.dto.js";
import { QueueService } from "./queue.service.js";

@Controller("queue")
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Public()
  @Get("public-snapshot")
  async getPublicSnapshot(@Query("channel") channelSlug: string | undefined) {
    return this.queueService.getPublicSnapshot(channelSlug);
  }

  @Roles("viewer", "host", "owner")
  @Get("snapshot")
  async getSnapshot(
    @Query("channel") channelSlug: string | undefined,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.getSnapshot(channelSlug, user.id);
  }

  @Roles("host", "owner")
  @Post("next")
  async moveToNextPerformer(
    @Body() body: ChannelScopedQueueVersionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.moveToNextPerformer(
      user.id,
      body.expectedQueueVersion,
      body.channelSlug
    );
  }

  @Roles("host", "owner")
  @Post("rebalance")
  async rebalanceQueue(
    @Body() body: ChannelScopedQueueVersionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.rebalanceQueue(
      user.id,
      body.expectedQueueVersion,
      body.channelSlug
    );
  }

  @Roles("host", "owner")
  @Post(":requestId/move")
  async moveRequest(
    @Param("requestId") requestId: string,
    @Body() body: MoveRequestDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.moveRequest(
      requestId,
      body.position,
      user.id,
      body.expectedQueueVersion
    );
  }

  @Roles("host", "owner")
  @Post(":requestId/call")
  async callRequest(
    @Param("requestId") requestId: string,
    @Body() body: QueueVersionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.callRequest(requestId, user.id, body.expectedQueueVersion);
  }

  @Roles("host", "owner")
  @Post(":requestId/defer")
  async deferRequest(
    @Param("requestId") requestId: string,
    @Body() body: DeferRequestDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.deferRequest(
      requestId,
      user.id,
      body.expectedQueueVersion,
      body.positions
    );
  }

  @Roles("host", "owner")
  @Post("guest/:guestId/cancel-future")
  async cancelGuestFutureRequests(
    @Param("guestId") guestId: string,
    @Body() body: ChannelScopedQueueVersionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.cancelGuestFutureRequests(
      guestId,
      user.id,
      body.expectedQueueVersion,
      body.channelSlug
    );
  }

  @Roles("host", "owner")
  @Post("undo")
  async undo(
    @Body() body: ChannelScopedQueueVersionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.queueService.undoLastAction(
      user.id,
      body.expectedQueueVersion,
      body.channelSlug
    );
  }
}
