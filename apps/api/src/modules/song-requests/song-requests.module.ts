import { Module } from "@nestjs/common";
import { GuestsModule } from "../guests/guests.module.js";
import { SessionsModule } from "../sessions/sessions.module.js";
import { QueueModule } from "../queue/queue.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { AuditModule } from "../audit/audit.module.js";
import { RequestChannelsModule } from "../request-channels/request-channels.module.js";
import { SongRequestsController } from "./song-requests.controller.js";
import { SongRequestsService } from "./song-requests.service.js";

@Module({
  imports: [GuestsModule, SessionsModule, QueueModule, SettingsModule, AuditModule, RequestChannelsModule],
  controllers: [SongRequestsController],
  providers: [SongRequestsService],
  exports: [SongRequestsService]
})
export class SongRequestsModule {}
