import { describe, expect, it } from "vitest";
import { validateEnv } from "../src/common/config/env.js";

const productionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://karaoke:karaoke@localhost:5432/karaoke",
  SESSION_SECRET: "session-secret-long-enough",
  TELEGRAM_BOT_TOKEN: "main-bot-token",
  TELEGRAM_WEBHOOK_SECRET: "main-webhook-secret",
  TELEGRAM_WEBHOOK_URL: "https://calc1.printninjas.ru/karaoke/api/telegram/webhook",
  OWNER_PASSWORD: "owner-password"
};

describe("Petya production environment", () => {
  it("accepts a separately configured Petya bot", () => {
    const env = validateEnv({
      ...productionEnv,
      TELEGRAM_PETYA_BOT_TOKEN: "petya-bot-token",
      TELEGRAM_PETYA_WEBHOOK_SECRET: "petya-webhook-secret",
      TELEGRAM_PETYA_WEBHOOK_URL:
        "https://calc1.printninjas.ru/karaoke/api/telegram/petya/webhook"
    });

    expect(env.TELEGRAM_PETYA_BOT_TOKEN).toBe("petya-bot-token");
  });

  it("requires a separate webhook secret when the Petya bot is enabled", () => {
    expect(() =>
      validateEnv({
        ...productionEnv,
        TELEGRAM_PETYA_BOT_TOKEN: "petya-bot-token"
      })
    ).toThrow(/TELEGRAM_PETYA_WEBHOOK_SECRET/);
  });
});
