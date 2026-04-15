import { Injectable } from "@nestjs/common";
import type { GlobalSettings } from "@karaoke/contracts";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/db/prisma.service.js";
import { DEFAULT_SETTINGS } from "./settings.constants.js";
import { UpdateSettingsDto } from "./settings.dto.js";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalSettings(): Promise<GlobalSettings> {
    const settings = await this.prisma.setting.findMany();
    const merged = structuredClone(DEFAULT_SETTINGS) as GlobalSettings;

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
          merged.botReplyTemplates = {
            ...merged.botReplyTemplates,
            ...(setting.valueJson as GlobalSettings["botReplyTemplates"])
          };
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
    }

    return merged;
  }

  async updateGlobalSettings(
    update: UpdateSettingsDto,
    updatedByStaffId: string
  ): Promise<GlobalSettings> {
    const current = await this.getGlobalSettings();
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
      Object.entries(next).map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          update: {
            valueJson: value as Prisma.InputJsonValue,
            updatedByStaffId
          },
          create: {
            key,
            valueJson: value as Prisma.InputJsonValue,
            updatedByStaffId
          }
        })
      )
    );

    return next;
  }

  async snapshotGlobalSettings() {
    return this.getGlobalSettings();
  }
}
