import { describe, expect, it } from "vitest";
import { getTelegramPublicQueueUrl } from "../src/modules/telegram/telegram-public-queue-url.js";

describe("getTelegramPublicQueueUrl", () => {
  it("uses the dedicated Petya page", () => {
    expect(getTelegramPublicQueueUrl("petya")).toBe(
      "https://calc1.printninjas.ru/karaoke-petya/queue"
    );
  });

  it("preserves a personal queue token", () => {
    expect(getTelegramPublicQueueUrl("petya", "guest-token")).toBe(
      "https://calc1.printninjas.ru/karaoke-petya/queue?guest=guest-token"
    );
  });
});
