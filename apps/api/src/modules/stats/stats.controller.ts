import { Controller, Get } from "@nestjs/common";
import { Roles } from "../../common/decorators/roles.decorator.js";
import { StatsService } from "./stats.service.js";

@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Roles("viewer", "host", "owner")
  @Get("active-session")
  async getActiveSessionStats() {
    return this.statsService.getActiveSessionStats();
  }
}
