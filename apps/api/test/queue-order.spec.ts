import { describe, expect, it } from "vitest";
import { OrderMode } from "@prisma/client";
import {
  buildQueuePlan,
  forecastTurnsUntilRequest
} from "../src/modules/queue/queue-order.js";

const defaultFlags = {
  prioritizeFirstTimeSinger: true,
  prioritizeLowerSungCount: true,
  prioritizeRequestTime: true
};

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
      defaultFlags
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
      defaultFlags
    );

    expect(ordered.map((item) => item.id)).toEqual(["req-2", "req-1", "req-3"]);
  });

  it("forecasts turns ahead after repeat singers move down", () => {
    const requests = [
      {
        id: "guest-a-first",
        guestProfileId: "guest-a",
        requestedAt: new Date("2026-04-14T18:00:00.000Z"),
        orderMode: OrderMode.auto,
        manualRank: null
      },
      {
        id: "guest-a-target",
        guestProfileId: "guest-a",
        requestedAt: new Date("2026-04-14T18:01:00.000Z"),
        orderMode: OrderMode.auto,
        manualRank: null
      },
      {
        id: "guest-b-first",
        guestProfileId: "guest-b",
        requestedAt: new Date("2026-04-14T18:02:00.000Z"),
        orderMode: OrderMode.auto,
        manualRank: null
      },
      {
        id: "guest-c-first",
        guestProfileId: "guest-c",
        requestedAt: new Date("2026-04-14T18:03:00.000Z"),
        orderMode: OrderMode.auto,
        manualRank: null
      }
    ];

    const currentPlan = buildQueuePlan(requests, new Map(), defaultFlags);
    const targetRank = currentPlan.find((item) => item.id === "guest-a-target")?.queueRank;

    expect(targetRank).toBe(2);
    expect(
      forecastTurnsUntilRequest(requests, new Map(), defaultFlags, "guest-a-target")
    ).toBe(3);
  });

  it("forecasts zero turns when the request is next", () => {
    expect(
      forecastTurnsUntilRequest(
        [
          {
            id: "req-1",
            guestProfileId: "guest-a",
            requestedAt: new Date("2026-04-14T18:00:00.000Z"),
            orderMode: OrderMode.auto,
            manualRank: null
          }
        ],
        new Map(),
        defaultFlags,
        "req-1"
      )
    ).toBe(0);
  });
});
