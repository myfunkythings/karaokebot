import { describe, expect, it } from "vitest";
import { OrderMode } from "@prisma/client";
import { buildQueuePlan } from "../src/modules/queue/queue-order.js";

describe("buildQueuePlan", () => {
  it("prioritizes guests who have not sung yet", () => {
    const ordered = buildQueuePlan(
      [
        {
          id: "req-1",
          guestProfileId: "guest-a",
          requestedAt: new Date("2026-04-14T18:00:00.000Z"),
          orderMode: OrderMode.auto,
          manualRank: null
        },
        {
          id: "req-2",
          guestProfileId: "guest-b",
          requestedAt: new Date("2026-04-14T18:01:00.000Z"),
          orderMode: OrderMode.auto,
          manualRank: null
        }
      ],
      new Map([
        ["guest-a", { sungCount: 1 }],
        ["guest-b", { sungCount: 0 }]
      ]),
      {
        prioritizeFirstTimeSinger: true,
        prioritizeLowerSungCount: true,
        prioritizeRequestTime: true
      }
    );

    expect(ordered.map((item) => item.id)).toEqual(["req-2", "req-1"]);
  });

  it("keeps manual pins in place while auto requests fill gaps", () => {
    const ordered = buildQueuePlan(
      [
        {
          id: "req-1",
          guestProfileId: "guest-a",
          requestedAt: new Date("2026-04-14T18:00:00.000Z"),
          orderMode: OrderMode.auto,
          manualRank: null
        },
        {
          id: "req-2",
          guestProfileId: "guest-b",
          requestedAt: new Date("2026-04-14T18:01:00.000Z"),
          orderMode: OrderMode.manual_pin,
          manualRank: 1
        },
        {
          id: "req-3",
          guestProfileId: "guest-c",
          requestedAt: new Date("2026-04-14T18:02:00.000Z"),
          orderMode: OrderMode.auto,
          manualRank: null
        }
      ],
      new Map(),
      {
        prioritizeFirstTimeSinger: true,
        prioritizeLowerSungCount: true,
        prioritizeRequestTime: true
      }
    );

    expect(ordered.map((item) => item.id)).toEqual(["req-2", "req-1", "req-3"]);
  });
});
