import { describe, expect, it } from "vitest";
import {
  botProfiles,
  getActiveBotProfile,
  getBotProfileBySlug,
  getLoginPath,
  getRuntimeRouterBase
} from "./botProfiles";

describe("Petya bot profile", () => {
  it("selects Petya for the dedicated calc1 path", () => {
    expect(getActiveBotProfile("calc1.printninjas.ru", "/karaoke-petya")).toBe(
      botProfiles.petya
    );
    expect(getActiveBotProfile("calc1.printninjas.ru", "/karaoke-petya/archive")).toBe(
      botProfiles.petya
    );
  });

  it("does not confuse similarly prefixed paths with the Petya page", () => {
    expect(getActiveBotProfile("calc1.printninjas.ru", "/karaoke-petya-old")).toBe(
      botProfiles.mishka
    );
  });

  it("uses the dedicated path as the router basename", () => {
    expect(getRuntimeRouterBase("calc1.printninjas.ru", "/karaoke-petya/login")).toBe(
      "/karaoke-petya"
    );
    expect(getLoginPath("calc1.printninjas.ru", "/karaoke-petya")).toBe(
      "/karaoke-petya/login"
    );
  });

  it("keeps the existing hostname-based Zapoi profile", () => {
    expect(getActiveBotProfile("zapoi.john-doe.ru", "/admin")).toBe(botProfiles.zapoi);
    expect(getRuntimeRouterBase("zapoi.john-doe.ru", "/admin")).toBe("");
  });

  it("resolves Petya by bot slug", () => {
    expect(getBotProfileBySlug("petya")).toBe(botProfiles.petya);
  });
});
