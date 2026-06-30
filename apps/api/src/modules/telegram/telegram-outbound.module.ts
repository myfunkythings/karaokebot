import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module.js";
import { TelegramOutboundService } from "./telegram-outbound.service.js";

@Module({
  imports: [SettingsModule],
  providers: [TelegramOutboundService],
  exports: [TelegramOutboundService]
})
export class TelegramOutboundModule {}
