import { Injectable } from "@nestjs/common";
import type { GlobalSettings } from "@karaoke/contracts";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/db/prisma.service.js";
import { DEFAULT_SETTINGS } from "./settings.constants.js";
import { UpdateSettingsDto } from "./settings.dto.js";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalSettings(channelSlug = "main"): Promise<GlobalSettings> {
    const normalizedChannelSlug = channelSlug.trim() || "main";
    const scopedBotReplyTemplatesKey = this.getBotReplyTemplatesKey(
      normalizedChannelSlug
    );
    const settings = await this.prisma.setting.findMany();
    const merged = structuredClone(DEFAULT_SETTINGS) as GlobalSettings;
    let legacyBotReplyTemplates: GlobalSettings["botReplyTemplates"] | null = null;
    let scopedBotReplyTemplates: GlobalSettings["botReplyTemplates"] | null = null;

    for (const setting of settings) {
      switch (setting.key) {
        case "antiSpamSeconds":
          merged.antiSpamSeconds = setting.valueJson as number;
          break;
        case "skipDownPositions":
          merged.skipDownPositions = setting.valueJson as number;
          break;
        case "queuePolicyFlags":
          merged.queuePolicyFlags = {
            ...merged.queuePolicyFlags,
            ...(setting.valueJson as GlobalSettings["queuePolicyFlags"])
          };
          break;
        case "botReplyTemplates":
          legacyBotReplyTemplates =
            setting.valueJson as GlobalSettings["botReplyTemplates"];
          break;
        case "uiLabels":
          merged.uiLabels = {
            ...merged.uiLabels,
            ...(setting.valueJson as GlobalSettings["uiLabels"])
          };
          break;
        default:
          break;
      }

      if (setting.key === scopedBotReplyTemplatesKey) {
        scopedBotReplyTemplates =
          setting.valueJson as GlobalSettings["botReplyTemplates"];
      }
    }

    const channelBotReplyTemplates =
      scopedBotReplyTemplates ??
      (normalizedChannelSlug === "main" ? null : legacyBotReplyTemplates);
    if (channelBotReplyTemplates) {
      merged.botReplyTemplates = {
        ...merged.botReplyTemplates,
        ...channelBotReplyTemplates
      };
    }

    return merged;
  }

  private getBotReplyTemplatesKey(channelSlug: string) {
    return `botReplyTemplates:${channelSlug}`;
  }

  async updateGlobalSettings(
    update: UpdateSettingsDto,
    updatedByStaffId: string,
    channelSlug = "main"
  ): Promise<GlobalSettings> {
    const normalizedChannelSlug = channelSlug.trim() || "main";
    const current = await this.getGlobalSettings(normalizedChannelSlug);
    const next: GlobalSettings = {
      ...current,
      ...update,
      queuePolicyFlags: {
        ...current.queuePolicyFlags,
        ...update.queuePolicyFlags
      },
      botReplyTemplates: {
        ...current.botReplyTemplates,
        ...update.botReplyTemplates
      },
      uiLabels: {
        ...current.uiLabels,
        ...update.uiLabels
      }
    };

    await Promise.all(
      Object.entries(next).map(([key, value]) => {
        const storageKey =
          key === "botReplyTemplates"
            ? this.getBotReplyTemplatesKey(normalizedChannelSlug)
            : key;

        return this.prisma.setting.upsert({
          where: { key: storageKey },
          update: {
            valueJson: value as Prisma.InputJsonValue,
            updatedByStaffId
          },
          create: {
            key: storageKey,
            valueJson: value as Prisma.InputJsonValue,
            updatedByStaffId
          }
        });
      })
    );

    return this.getGlobalSettings(normalizedChannelSlug);
  }

  async snapshotGlobalSettings() {
    return this.getGlobalSettings();
  }
}
