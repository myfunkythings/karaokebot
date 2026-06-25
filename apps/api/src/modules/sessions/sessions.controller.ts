import { Body, Controller, Get, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Roles } from "../../common/decorators/roles.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { CloseSessionDto, OpenSessionDto } from "./sessions.dto.js";
import { SessionsService } from "./sessions.service.js";

@Controller("sessions")
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Roles("viewer", "host", "owner")
  @Get("active")
  async getActiveSession() {
    return this.sessionsService.getActiveSessionSummary();
  }

  @Roles("host", "owner")
  @Post("open")
  async openSession(
    @Body() body: OpenSessionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.sessionsService.openSession({
      title: body.title,
      timezone: body.timezone,
      createdByStaffId: user.id
    });
  }

  @Roles("host", "owner")
  @Post("active/close")
  async closeActiveSession(
    @Body() body: CloseSessionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.sessionsService.closeActiveSession(user.id, body.expectedQueueVersion);
  }
}
