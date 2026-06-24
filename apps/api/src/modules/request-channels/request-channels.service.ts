import { Injectable, NotFoundException } from "@nestjs/common";
import type { RequestChannel } from "@prisma/client";
import { PrismaService } from "../../common/db/prisma.service.js";

export const DEFAULT_REQUEST_CHANNEL_SLUG = "main";

@Injectable()
export class RequestChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveChannels() {
    return this.prisma.requestChannel.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
  }

  async getDefaultChannel() {
    return this.getRequiredChannelBySlug(DEFAULT_REQUEST_CHANNEL_SLUG);
  }

  async getRequiredChannelBySlug(slug?: string | null): Promise<RequestChannel> {
    const normalizedSlug = this.normalizeSlug(slug);
    const channel = await this.prisma.requestChannel.findUnique({
      where: { slug: normalizedSlug }
    });

    if (!channel || !channel.isActive) {
      throw new NotFoundException("Request channel not found");
    }

    return channel;
  }

  normalizeSlug(slug?: string | null) {
    return slug?.trim() || DEFAULT_REQUEST_CHANNEL_SLUG;
  }
}
