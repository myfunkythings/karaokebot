import { Injectable } from "@nestjs/common";
import type { SessionStatsDto } from "@karaoke/contracts";
import { SongRequestStatus } from "@prisma/client";
import { PrismaService } from "../../common/db/prisma.service.js";
import { SessionsService } from "../sessions/sessions.service.js";

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService
  ) {}

  async getActiveSessionStats(): Promise<SessionStatsDto | null> {
    const session = await this.sessionsService.getActiveSession();
    if (!session) {
      return null;
    }

    const requests = await this.prisma.songRequest.findMany({
      where: { sessionId: session.id }
    });
    const topSingers = await this.prisma.sessionGuestStat.findMany({
      where: { sessionId: session.id },
      include: { guestProfile: true },
      orderBy: [{ sungCount: "desc" }, { requestsCount: "desc" }],
      take: 10
    });

    const waits = requests
      .filter((request) => request.completedAt)
      .map((request) => {
        const completedAt = request.completedAt ?? request.requestedAt;
        return (completedAt.getTime() - request.requestedAt.getTime()) / 1000 / 60;
      });

    return {
      totalRequests: requests.length,
      totalSung: requests.filter((request) => request.status === SongRequestStatus.sung).length,
      totalCancelled: requests.filter(
        (request) => request.status === SongRequestStatus.cancelled
      ).length,
      totalDeferred: requests.reduce((total, request) => total + request.deferCount, 0),
      averageWaitMinutes: waits.length
        ? Math.round((waits.reduce((total, value) => total + value, 0) / waits.length) * 10) /
          10
        : 0,
      topSingers: topSingers.map((stat) => ({
        guestId: stat.guestProfileId,
        displayName: stat.guestProfile.displayName,
        sungCount: stat.sungCount,
        requestsCount: stat.requestsCount
      }))
    };
  }
}
