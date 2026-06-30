import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcryptjs";
import type { LoginResponseDto } from "@karaoke/contracts";
import { StaffRole, type StaffUser } from "@prisma/client";
import { PrismaService } from "../../common/db/prisma.service.js";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async validateUser(
    login: string,
    password: string,
    operatorName?: string
  ): Promise<AuthenticatedUser> {
    const sharedAccess = this.getSharedAccessConfig();
    if (login !== sharedAccess.login || password !== sharedAccess.password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const staffUser = await this.ensureSharedAccessUser(operatorName);
    return this.toAuthenticatedUser(staffUser);
  }

  async getActiveUserById(userId: string): Promise<AuthenticatedUser | null> {
    const sharedAccess = this.getSharedAccessConfig();
    const staffUser = await this.prisma.staffUser.findUnique({
      where: { id: userId }
    });

    if (
      !staffUser ||
      !staffUser.isActive ||
      !this.isSharedAccessLogin(staffUser.login, sharedAccess.login) ||
      staffUser.role !== StaffRole.owner
    ) {
      return null;
    }

    return this.toAuthenticatedUser(staffUser);
  }

  toLoginResponse(user: AuthenticatedUser): LoginResponseDto {
    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
        login: user.login
      }
    };
  }

  private async ensureSharedAccessUser(operatorName?: string) {
    const sharedAccess = this.getSharedAccessConfig();
    const passwordHash = await bcrypt.hash(sharedAccess.password, 10);
    const lastLoginAt = new Date();
    const displayName = operatorName?.trim() || sharedAccess.displayName;
    const login = operatorName?.trim()
      ? `${sharedAccess.login}:${this.toOperatorSlug(operatorName)}`
      : sharedAccess.login;

    return this.prisma.staffUser.upsert({
      where: { login },
      update: {
        displayName,
        role: StaffRole.owner,
        passwordHash,
        isActive: true,
        lastLoginAt
      },
      create: {
        login,
        displayName,
        role: StaffRole.owner,
        passwordHash,
        lastLoginAt
      }
    });
  }

  private getSharedAccessConfig() {
    return {
      login: this.configService.getOrThrow<string>("OWNER_LOGIN"),
      password: this.configService.getOrThrow<string>("OWNER_PASSWORD"),
      displayName: this.configService.getOrThrow<string>("OWNER_DISPLAY_NAME")
    };
  }

  private toAuthenticatedUser(staffUser: Pick<StaffUser, "id" | "login" | "displayName" | "role">) {
    return {
      id: staffUser.id,
      login: staffUser.login,
      displayName: staffUser.displayName,
      role: staffUser.role
    };
  }

  private isSharedAccessLogin(login: string, sharedLogin: string) {
    return login === sharedLogin || login.startsWith(`${sharedLogin}:`);
  }

  private toOperatorSlug(operatorName: string) {
    return operatorName
      .trim()
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/giu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "operator";
  }
}
