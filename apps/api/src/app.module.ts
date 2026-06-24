import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./common/config/env.js";
import { PrismaModule } from "./common/db/prisma.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { SessionsModule } from "./modules/sessions/sessions.module.js";
import { GuestsModule } from "./modules/guests/guests.module.js";
import { QueueModule } from "./modules/queue/queue.module.js";
import { TelegramModule } from "./modules/telegram/telegram.module.js";
import { SettingsModule } from "./modules/settings/settings.module.js";
import { StatsModule } from "./modules/stats/stats.module.js";
import { AuditModule } from "./modules/audit/audit.module.js";
import { SongRequestsModule } from "./modules/song-requests/song-requests.module.js";
import { RequestChannelsModule } from "./modules/request-channels/request-channels.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv
    }),
    PrismaModule,
    AuthModule,
    SettingsModule,
    SessionsModule,
    GuestsModule,
    RequestChannelsModule,
    AuditModule,
    QueueModule,
    SongRequestsModule,
    TelegramModule,
    StatsModule
  ]
})
export class AppModule {}
