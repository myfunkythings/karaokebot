import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { SessionTokenService } from "../../common/auth/session-token.service.js";
import { AuthGuard } from "../../common/guards/auth.guard.js";
import { RolesGuard } from "../../common/guards/roles.guard.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionTokenService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ],
  exports: [AuthService, SessionTokenService]
})
export class AuthModule {}
