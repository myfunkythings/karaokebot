import { Module } from "@nestjs/common";
import { SongRequestsModule } from "../song-requests/song-requests.module.js";
import { SettingsModule } from "../settings/settings.module.js";
import { RequestChannelsModule } from "../request-channels/request-channels.module.js";
import { TelegramOutboundModule } from "./telegram-outbound.module.js";
import { TelegramController } from "./telegram.controller.js";
import { TelegramService } from "./telegram.service.js";

@Module({
  imports: [SongRequestsModule, SettingsModule, RequestChannelsModule, TelegramOutboundModule],
  controllers: [TelegramController],
  providers: [TelegramService]
})
export class TelegramModule {}
