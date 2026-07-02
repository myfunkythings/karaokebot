import type { QueuePolicyFlags } from "@karaoke/contracts";
import { OrderMode } from "@prisma/client";

export type QueueOrderRequest = {
  id: string;
  guestProfileId: string;
  requestedAt: Date;
  orderMode: OrderMode;
  manualRank: number | null;
};

export type QueueGuestStats = {
  sungCount: number;
};

export function buildQueuePlan(
  requests: QueueOrderRequest[],
  statsByGuest: Map<string, QueueGuestStats>,
  flags: QueuePolicyFlags
) {
  const total = requests.length;
  if (!total) {
    return [];
  }

  const manualRequests = requests
    .filter((request) => request.orderMode === OrderMode.manual_pin && request.manualRank)
    .sort(
      (left, right) =>
        (left.manualRank ?? Number.MAX_SAFE_INTEGER) -
          (right.manualRank ?? Number.MAX_SAFE_INTEGER) ||
        left.requestedAt.getTime() - right.requestedAt.getTime() ||
        left.id.localeCompare(right.id)
    );

  const autoRequests = requests
    .filter((request) => request.orderMode === OrderMode.auto || !request.manualRank)
    .sort((left, right) => compareAutoRequests(left, right, statsByGuest, flags));

  const pinnedSlots = new Map<number, QueueOrderRequest>();
  const normalizedManualRanks = new Map<string, number>();

  for (const request of manualRequests) {
    let slot = clamp(request.manualRank ?? total, 1, total);
    while (slot <= total && pinnedSlots.has(slot)) {
      slot += 1;
    }
    while (slot > total && pinnedSlots.has(slot)) {
      slot -= 1;
    }
    if (slot > total) {
      slot = total;
      while (slot > 1 && pinnedSlots.has(slot)) {
        slot -= 1;
      }
    }
    pinnedSlots.set(slot, request);
    normalizedManualRanks.set(request.id, slot);
  }

  const ordered: Array<{
    id: string;
    queueRank: number;
    orderMode: OrderMode;
    manualRank: number | null;
  }> = [];
  const autoQueue = [...autoRequests];

  for (let rank = 1; rank <= total; rank += 1) {
    const pinned = pinnedSlots.get(rank);
    if (pinned) {
      ordered.push({
        id: pinned.id,
        queueRank: rank,
        orderMode: OrderMode.manual_pin,
        manualRank: normalizedManualRanks.get(pinned.id) ?? rank
      });
      continue;
    }

    const nextAuto = autoQueue.shift();
    if (!nextAuto) {
      break;
    }
    ordered.push({
      id: nextAuto.id,
      queueRank: rank,
      orderMode: OrderMode.auto,
      manualRank: null
    });
  }

  return ordered;
}

export function forecastTurnsUntilRequest(
  requests: QueueOrderRequest[],
  statsByGuest: Map<string, QueueGuestStats>,
  flags: QueuePolicyFlags,
  targetRequestId: string
) {
  if (!requests.some((request) => request.id === targetRequestId)) {
    return null;
  }

  const remainingRequests = [...requests];
  const forecastStats = new Map(
    [...statsByGuest.entries()].map(([guestId, stats]) => [
      guestId,
      { sungCount: stats.sungCount }
    ])
  );
  let turnsAhead = 0;

  while (remainingRequests.length) {
    const plan = buildQueuePlan(remainingRequests, forecastStats, flags);
    const nextId = plan[0]?.id;
    if (!nextId) {
      return null;
    }

    if (nextId === targetRequestId) {
      return turnsAhead;
    }

    const nextIndex = remainingRequests.findIndex((request) => request.id === nextId);
    if (nextIndex === -1) {
      return null;
    }

    const [completedRequest] = remainingRequests.splice(nextIndex, 1);
    if (!completedRequest) {
      return null;
    }

    const currentStats = forecastStats.get(completedRequest.guestProfileId) ?? {
      sungCount: 0
    };
    forecastStats.set(completedRequest.guestProfileId, {
      sungCount: currentStats.sungCount + 1
    });
    turnsAhead += 1;
  }

  return null;
}

function compareAutoRequests(
  left: QueueOrderRequest,
  right: QueueOrderRequest,
  statsByGuest: Map<string, QueueGuestStats>,
  flags: QueuePolicyFlags
) {
  const leftStats = statsByGuest.get(left.guestProfileId) ?? { sungCount: 0 };
  const rightStats = statsByGuest.get(right.guestProfileId) ?? { sungCount: 0 };

  if (flags.prioritizeFirstTimeSinger) {
    const leftFirst = leftStats.sungCount === 0 ? 0 : 1;
    const rightFirst = rightStats.sungCount === 0 ? 0 : 1;
    if (leftFirst !== rightFirst) {
      return leftFirst - rightFirst;
    }
  }

  if (flags.prioritizeLowerSungCount && leftStats.sungCount !== rightStats.sungCount) {
    return leftStats.sungCount - rightStats.sungCount;
  }

  if (flags.prioritizeRequestTime) {
    const requestedAtDiff = left.requestedAt.getTime() - right.requestedAt.getTime();
    if (requestedAtDiff !== 0) {
      return requestedAtDiff;
    }
  }

  return left.id.localeCompare(right.id);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
