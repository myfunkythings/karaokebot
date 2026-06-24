import { describe, expect, it } from "vitest";
import {
  isTelegramCancelIntent,
  isTelegramStatusIntent,
  TELEGRAM_CANCEL_BUTTON_TEXT,
  TELEGRAM_STATUS_BUTTON_TEXT
} from "../src/modules/telegram/telegram-status-intent.js";

describe("isTelegramStatusIntent", () => {
  it.each([
    "моя позиция",
    TELEGRAM_STATUS_BUTTON_TEXT,
    "  МОЯ   ПОЗИЦИЯ  ",
    "моя_позиция",
    "/моя_позиция",
    "/position",
    "/status@KaraokeMainBot",
    "мой статус"
  ])("recognizes %s as a status request", (text) => {
    expect(isTelegramStatusIntent(text)).toBe(true);
  });

  it.each(["Кино - Моя позиция", "позиция группы - песня", "Queen - The Show Must Go On"])(
    "does not treat %s as a status request",
    (text) => {
      expect(isTelegramStatusIntent(text)).toBe(false);
    }
  );
});

describe("isTelegramCancelIntent", () => {
  it.each([
    TELEGRAM_CANCEL_BUTTON_TEXT,
    "  удалить   все мои заявки из очереди  ",
    "/cancel",
    "/delete_my_requests",
    "/удалить_мои_заявки"
  ])("recognizes %s as a cancel request", (text) => {
    expect(isTelegramCancelIntent(text)).toBe(true);
  });

  it.each(["Кино - Удалить все мои заявки", "удали заявку на песню"])(
    "does not treat %s as a cancel request",
    (text) => {
      expect(isTelegramCancelIntent(text)).toBe(false);
    }
  );
});
