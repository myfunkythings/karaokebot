import { Module } from "@nestjs/common";
import { SongRequestsModule } from "../song-requests/song-requests.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { TelegramController } from "./telegram.controller.js";
import { TelegramService } from "./telegram.service.js";

@Module({
  imports: [SongRequestsModule, SettingsModule],
  controllers: [TelegramController],
  providers: [TelegramService]
})
export class TelegramModule {}
