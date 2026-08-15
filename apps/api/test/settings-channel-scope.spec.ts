import { describe, expect, it, vi } from "vitest";
import { SettingsService } from "../src/modules/settings/settings.service.js";
import { DEFAULT_SETTINGS } from "../src/modules/settings/settings.constants.js";

describe("SettingsService channel-scoped bot replies", () => {
  it("keeps Mishka defaults separate from legacy John Doe replies", async () => {
    const johnDoeTemplates = {
      ...DEFAULT_SETTINGS.botReplyTemplates,
      startMessage: "Добро пожаловать в санаторий «Джон До».",
      unknownCommand: "Талончик без диагноза не выдаём."
    };
    const prisma = {
      setting: {
        findMany: vi.fn().mockResolvedValue([
          { key: "botReplyTemplates", valueJson: johnDoeTemplates }
        ])
      }
    };
    const service = new SettingsService(prisma as never);

    const mishka = await service.getGlobalSettings("main");
    const johnDoe = await service.getGlobalSettings("secondary");

    expect(mishka.botReplyTemplates.startMessage).toBe(
      DEFAULT_SETTINGS.botReplyTemplates.startMessage
    );
    expect(mishka.botReplyTemplates.unknownCommand).toBe(
      DEFAULT_SETTINGS.botReplyTemplates.unknownCommand
    );
    expect(johnDoe.botReplyTemplates.startMessage).toBe(johnDoeTemplates.startMessage);
    expect(johnDoe.botReplyTemplates.unknownCommand).toBe(
      johnDoeTemplates.unknownCommand
    );
  });

  it("stores updated replies under the selected channel without replacing legacy replies", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const prisma = {
      setting: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert
      }
    };
    const service = new SettingsService(prisma as never);
    const mishkaTemplates = {
      ...DEFAULT_SETTINGS.botReplyTemplates,
      startMessage: "Добро пожаловать в караоке Мишка!"
    };

    await service.updateGlobalSettings(
      { botReplyTemplates: mishkaTemplates },
      "staff-1",
      "main"
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "botReplyTemplates:main" },
        update: expect.objectContaining({ valueJson: mishkaTemplates }),
        create: expect.objectContaining({
          key: "botReplyTemplates:main",
          valueJson: mishkaTemplates
        })
      })
    );
    expect(upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: "botReplyTemplates" } })
    );
  });

  it("stores public queue appearance for the guest-facing page", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const prisma = {
      setting: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert
      }
    };
    const service = new SettingsService(prisma as never);
    const appearance = {
      ...DEFAULT_SETTINGS.publicQueueAppearance,
      accentColor: "#9f5fdd"
    };

    await service.updateGlobalSettings(
      { publicQueueAppearance: appearance },
      "staff-1",
      "main"
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "publicQueueAppearance" },
        update: expect.objectContaining({ valueJson: appearance })
      })
    );
  });
});
