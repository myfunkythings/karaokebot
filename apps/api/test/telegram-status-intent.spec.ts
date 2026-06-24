import { describe, expect, it } from "vitest";
import {
  isTelegramCancelAbortIntent,
  isTelegramCancelConfirmIntent,
  isTelegramCancelRequestIntent,
  isTelegramStatusIntent,
  TELEGRAM_ABORT_CANCEL_BUTTON_TEXT,
  TELEGRAM_CANCEL_BUTTON_TEXT,
  TELEGRAM_CONFIRM_CANCEL_BUTTON_TEXT,
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

describe("isTelegramCancelRequestIntent", () => {
  it.each([TELEGRAM_CANCEL_BUTTON_TEXT, "  удалить   все мои заявки из очереди  "])(
    "recognizes %s as a cancel request",
    (text) => {
      expect(isTelegramCancelRequestIntent(text)).toBe(true);
    }
  );

  it.each([TELEGRAM_CONFIRM_CANCEL_BUTTON_TEXT, "/cancel", "Кино - Удалить все мои заявки"])(
    "does not treat %s as the first-step cancel request",
    (text) => {
      expect(isTelegramCancelRequestIntent(text)).toBe(false);
    }
  );
});

describe("isTelegramCancelConfirmIntent", () => {
  it.each([
    TELEGRAM_CONFIRM_CANCEL_BUTTON_TEXT,
    "  да,   удалить мои заявки  ",
    "/cancel",
    "/delete_my_requests",
    "/удалить_мои_заявки"
  ])("recognizes %s as a cancel confirmation", (text) => {
    expect(isTelegramCancelConfirmIntent(text)).toBe(true);
  });

  it.each(["Кино - Удалить все мои заявки", "удали заявку на песню"])(
    "does not treat %s as a cancel confirmation",
    (text) => {
      expect(isTelegramCancelConfirmIntent(text)).toBe(false);
    }
  );
});

describe("isTelegramCancelAbortIntent", () => {
  it.each([TELEGRAM_ABORT_CANCEL_BUTTON_TEXT, "  НЕ   УДАЛЯТЬ  "])(
    "recognizes %s as a cancel abort",
    (text) => {
      expect(isTelegramCancelAbortIntent(text)).toBe(true);
    }
  );
});
