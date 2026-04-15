import { Module } from "@nestjs/common";
import { SessionsModule } from "../sessions/sessions.module.js";
import { StatsController } from "./stats.controller.js";
import { StatsService } from "./stats.service.js";

@Module({
  imports: [SessionsModule],
  controllers: [StatsController],
  providers: [StatsService]
})
export class StatsModule {}
