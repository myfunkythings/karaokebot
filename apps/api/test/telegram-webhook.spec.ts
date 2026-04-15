import { describe, expect, it } from "vitest";
import {
  isTelegramWebhookPlaceholder,
  resolveTelegramWebhookUrl
} from "../src/modules/telegram/telegram-webhook.js";

describe("resolveTelegramWebhookUrl", () => {
  it("prefers explicit webhook url", () => {
    expect(
      resolveTelegramWebhookUrl({
        explicitUrl: "https://bot.example.com/custom/webhook/"
      })
    ).toBe("https://bot.example.com/custom/webhook");
  });

  it("builds webhook url from bare domain", () => {
    expect(
      resolveTelegramWebhookUrl({
        domain: "calc1.printninjas.ru"
      })
    ).toBe("https://calc1.printninjas.ru/karaoke/api/telegram/webhook");
  });

  it("builds webhook url from domain with scheme", () => {
    expect(
      resolveTelegramWebhookUrl({
        domain: "http://calc1.printninjas.ru/"
      })
    ).toBe("http://calc1.printninjas.ru/karaoke/api/telegram/webhook");
  });

  it("returns null when no domain or explicit url is provided", () => {
    expect(resolveTelegramWebhookUrl({})).toBeNull();
  });
});

describe("isTelegramWebhookPlaceholder", () => {
  it("detects placeholder values", () => {
    expect(isTelegramWebhookPlaceholder("replace-me-telegram-secret")).toBe(true);
    expect(isTelegramWebhookPlaceholder("change-this-domain")).toBe(true);
  });

  it("accepts real values", () => {
    expect(isTelegramWebhookPlaceholder("calc1.printninjas.ru")).toBe(false);
    expect(isTelegramWebhookPlaceholder("https://bot.example.com/webhook")).toBe(
      false
    );
  });
});
