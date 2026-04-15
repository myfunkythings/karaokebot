import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { SessionsController } from "./sessions.controller.js";
import { SessionsService } from "./sessions.service.js";

@Module({
  imports: [SettingsModule, AuditModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService]
})
export class SessionsModule {}
