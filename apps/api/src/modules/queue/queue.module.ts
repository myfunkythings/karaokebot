import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { SessionsModule } from "../sessions/sessions.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { RequestChannelsModule } from "../request-channels/request-channels.module.js";
import { QueueController } from "./queue.controller.js";
import { QueueService } from "./queue.service.js";

@Module({
  imports: [AuditModule, SessionsModule, SettingsModule, RequestChannelsModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule {}
