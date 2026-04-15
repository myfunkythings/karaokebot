import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { CurrentUser } from "../../common/decorators/current-user.decorator.js";
import { Public } from "../../common/decorators/public.decorator.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";
import { SessionTokenService, SESSION_COOKIE_NAME } from "../../common/auth/session-token.service.js";
import { LoginDto } from "./auth.dto.js";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionTokenService: SessionTokenService,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Post("login")
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response
  ) {
    const user = await this.authService.validateUser(body.login, body.password);
    const frontendUrl = this.configService.getOrThrow<string>("FRONTEND_URL");
    response.cookie(SESSION_COOKIE_NAME, this.sessionTokenService.sign(user), {
      httpOnly: true,
      sameSite: "lax",
      secure: frontendUrl.startsWith("https://"),
      maxAge: 1000 * 60 * 60 * 24 * 7
    });
    return this.authService.toLoginResponse(user);
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE_NAME);
    return { ok: true };
  }

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser | null) {
    return user ? this.authService.toLoginResponse(user) : { user: null };
  }
}
