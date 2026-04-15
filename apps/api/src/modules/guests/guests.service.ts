import { Injectable } from "@nestjs/common";
import type { GuestProfile } from "@prisma/client";
import { PrismaService } from "../../common/db/prisma.service.js";
import { normalizeDisplayName } from "../../common/utils/normalize-display-name.js";

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertTelegramGuest(params: {
    telegramUserId: string;
    telegramUsername?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<GuestProfile> {
    const displayName =
      [params.firstName, params.lastName].filter(Boolean).join(" ").trim() ||
      params.telegramUsername ||
      `guest-${params.telegramUserId}`;

    return this.prisma.guestProfile.upsert({
      where: { telegramUserId: params.telegramUserId },
      update: {
        telegramUsername: params.telegramUsername ?? null,
        firstName: params.firstName ?? null,
        lastName: params.lastName ?? null,
        displayName,
        normalizedDisplayName: normalizeDisplayName(displayName),
        lastSeenAt: new Date()
      },
      create: {
        telegramUserId: params.telegramUserId,
        telegramUsername: params.telegramUsername ?? null,
        firstName: params.firstName ?? null,
        lastName: params.lastName ?? null,
        displayName,
        normalizedDisplayName: normalizeDisplayName(displayName),
        lastSeenAt: new Date()
      }
    });
  }

  async findOrCreateManualGuest(displayName: string): Promise<GuestProfile> {
    const normalized = normalizeDisplayName(displayName);
    const existing = await this.prisma.guestProfile.findFirst({
      where: {
        normalizedDisplayName: normalized,
        telegramUserId: null
      }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.guestProfile.create({
      data: {
        displayName,
        normalizedDisplayName: normalized
      }
    });
  }

  async searchGuests(query: string) {
    return this.prisma.guestProfile.findMany({
      where: {
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { telegramUsername: { contains: query, mode: "insensitive" } }
        ]
      },
      orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
      take: 20
    });
  }
}
