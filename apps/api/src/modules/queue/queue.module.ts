import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { SessionsModule } from "../sessions/sessions.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { QueueController } from "./queue.controller.js";
import { QueueService } from "./queue.service.js";

@Module({
  imports: [AuditModule, SessionsModule, SettingsModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule {}
