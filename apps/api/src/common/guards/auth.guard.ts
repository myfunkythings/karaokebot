import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SessionTokenService, SESSION_COOKIE_NAME } from "../auth/session-token.service.js";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator.js";
import type { AuthenticatedUser } from "../types/authenticated-user.js";
import { AuthService } from "../../modules/auth/auth.service.js";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionTokenService: SessionTokenService,
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const request = context
      .switchToHttp()
      .getRequest<{ cookies?: Record<string, string>; user?: AuthenticatedUser }>();
    const token = request.cookies?.[SESSION_COOKIE_NAME];
    const tokenPayload = this.sessionTokenService.verify(token);
    const user = tokenPayload
      ? await this.authService.getActiveUserById(tokenPayload.id)
      : null;

    if (user) {
      request.user = user;
    }

    if (isPublic) {
      return true;
    }

    if (!user) {
      throw new UnauthorizedException("Authentication required");
    }

    return true;
  }
}
