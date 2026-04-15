import crypto from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { StaffRole } from "@karaoke/contracts";
import type { AuthenticatedUser } from "../types/authenticated-user.js";

type SessionPayload = AuthenticatedUser & {
  exp: number;
};

export const SESSION_COOKIE_NAME = "karaoke_session";

@Injectable()
export class SessionTokenService {
  constructor(private readonly configService: ConfigService) {}

  sign(user: AuthenticatedUser) {
    const payload: SessionPayload = {
      ...user,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = this.signValue(encodedPayload);
    return `${encodedPayload}.${signature}`;
  }

  verify(token: string | undefined): AuthenticatedUser | null {
    if (!token) {
      return null;
    }

    const [payloadEncoded, signature] = token.split(".");
    if (!payloadEncoded || !signature) {
      return null;
    }

    const expectedSignature = this.signValue(payloadEncoded);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadEncoded, "base64url").toString("utf8")
    ) as SessionPayload;

    if (payload.exp < Date.now()) {
      return null;
    }

    return {
      id: payload.id,
      login: payload.login,
      displayName: payload.displayName,
      role: payload.role as StaffRole
    };
  }

  private signValue(value: string) {
    return crypto
      .createHmac("sha256", this.configService.getOrThrow<string>("SESSION_SECRET"))
      .update(value)
      .digest("base64url");
  }
}
