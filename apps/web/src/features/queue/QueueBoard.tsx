import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueueSnapshotDto } from "@karaoke/contracts";
import { api } from "../../shared/api/client";
import { SortableQueueList } from "./SortableQueueList";

export function QueueBoard({
  snapshot,
  canManage
}: {
  snapshot: QueueSnapshotDto;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<
    "all" | "current" | "queued"
  >("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"position" | "guest" | "song" | "wait">("position");

  const refreshEverything = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["stats", "active"] })
    ]);
  };

  const nextMutation = useMutation({
    mutationFn: (expectedQueueVersion: number) =>
      api.nextPerformer(expectedQueueVersion, snapshot.activeChannelSlug),
    onSuccess: refreshEverything
  });
  const callRequestMutation = useMutation({
    mutationFn: ({ requestId, expectedQueueVersion }: { requestId: string; expectedQueueVersion: number }) =>
      api.callRequest(requestId, expectedQueueVersion),
    onSuccess: refreshEverything
  });
  const rebalanceMutation = useMutation({
    mutationFn: (expectedQueueVersion: number) =>
      api.rebalanceQueue(expectedQueueVersion, snapshot.activeChannelSlug),
    onSuccess: refreshEverything
  });
  const deferMutation = useMutation({
    mutationFn: ({ requestId, expectedQueueVersion }: { requestId: string; expectedQueueVersion: number }) =>
      api.deferRequest(requestId, expectedQueueVersion),
    onSuccess: refreshEverything
  });
  const cancelGuestMutation = useMutation({
    mutationFn: ({ guestId, expectedQueueVersion }: { guestId: string; expectedQueueVersion: number }) =>
      api.cancelGuestFuture(guestId, expectedQueueVersion, snapshot.activeChannelSlug),
    onSuccess: refreshEverything
  });
  const moveMutation = useMutation({
    mutationFn: ({ requestId, position }: { requestId: string; position: number }) =>
      api.moveRequest(requestId, position, snapshot.queueVersion ?? 0),
    onSuccess: refreshEverything
  });
  const undoMutation = useMutation({
    mutationFn: (expectedQueueVersion: number) =>
      api.undoLastAction(expectedQueueVersion, snapshot.activeChannelSlug),
    onSuccess: refreshEverything
  });
  const closeSessionMutation = useMutation({
    mutationFn: api.closeSession,
    onSuccess: refreshEverything
  });
  const sungCountByGuestId = snapshot.archive.reduce<Record<string, number>>((accumulator, item) => {
    if (item.outcome === "sung") {
      accumulator[item.guest.id] = (accumulator[item.guest.id] ?? 0) + 1;
    }
    return accumulator;
  }, {});
  const manualModeActive = snapshot.queued.some((item) => item.orderMode === "manual_pin");
  const nextRequest = snapshot.queued[0] ?? null;
  const expectedQueueVersion = snapshot.queueVersion ?? 0;

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const rows = snapshot.queued.filter((request, index) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "queued" && index >= 0);

      const songLabel = [request.artist, request.title, request.rawText].filter(Boolean).join(" ");
      const telegram = request.guest.telegramUsername ? `@${request.guest.telegramUsername}` : "";
      const matchesSearch =
        !normalizedSearch ||
        request.guest.displayName.toLowerCase().includes(normalizedSearch) ||
        telegram.toLowerCase().includes(normalizedSearch) ||
        songLabel.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });

    const sorted = [...rows];
    sorted.sort((left, right) => {
      switch (sortMode) {
        case "guest":
          return left.guest.displayName.localeCompare(right.guest.displayName, "ru");
        case "song":
          return (left.title ?? left.rawText).localeCompare(right.title ?? right.rawText, "ru");
        case "wait":
          return new Date(left.requestedAt).getTime() - new Date(right.requestedAt).getTime();
        case "position":
        default:
          return (left.queueRank ?? 9999) - (right.queueRank ?? 9999);
      }
    });

    return sorted;
  }, [search, snapshot.queued, sortMode, statusFilter]);

  function handleCallRequest(requestId: string) {
    const requestExists = snapshot.queued.some((item) => item.id === requestId);
    if (!requestExists) {
      return;
    }

    callRequestMutation.mutate({ requestId, expectedQueueVersion });
  }

  function handleMoveRequest(requestId: string, position: number) {
    moveMutation.mutate({ requestId, position });
  }

  function handleCloseSession() {
    const confirmed = window.confirm("Закрыть текущую смену? После этого новые заявки приниматься не будут.");
    if (confirmed) {
      closeSessionMutation.mutate(expectedQueueVersion);
    }
  }

  return (
    <div className="queue-board">
      <section className="shift-control-strip">
        <div className="shift-control-strip__summary">
          <div className="shift-control-strip__title">
            <h2>Оперативный пульт смены</h2>
            <span className={snapshot.session ? "shift-pill shift-pill--active" : "shift-pill"}>
              {snapshot.session ? "Смена идёт" : "Смена не открыта"}
            </span>
          </div>

          <div className="shift-facts">
            <div className="shift-fact">
              <span className="shift-fact__label">Статус смены</span>
              <strong>{snapshot.session?.title ?? "Ожидает открытия"}</strong>
            </div>
            <div className="shift-fact">
              <span className="shift-fact__label">Кто сейчас поёт</span>
              <strong>{snapshot.current?.guest.displayName ?? "Сцена свободна"}</strong>
            </div>
            <div className="shift-fact">
              <span className="shift-fact__label">Кто следующий</span>
              <strong>{nextRequest?.guest.displayName ?? "Очередь пуста"}</strong>
            </div>
            <div className="shift-fact">
              <span className="shift-fact__label">Статус автоочереди</span>
              <strong>{manualModeActive ? "Есть ручные перестановки" : "Автоочередь включена"}</strong>
            </div>
          </div>
        </div>

        <div className="shift-control-strip__actions">
          <button
            className="primary-button"
            onClick={() => nextMutation.mutate(expectedQueueVersion)}
            disabled={!canManage || !snapshot.session || (!snapshot.current && !nextRequest) || nextMutation.isPending}
          >
            {nextMutation.isPending ? "Вызываем…" : "Вызвать следующего"}
          </button>
          <button
            className="secondary-button"
            onClick={() => undoMutation.mutate(expectedQueueVersion)}
            disabled={!canManage || undoMutation.isPending}
          >
            {undoMutation.isPending ? "Отменяем…" : "Отменить последнее действие"}
          </button>
          <button
            className="danger-button danger-button--ghost"
            onClick={handleCloseSession}
            disabled={!canManage || !snapshot.session || closeSessionMutation.isPending}
          >
            {closeSessionMutation.isPending ? "Закрываем…" : "Закрыть смену"}
          </button>
        </div>
      </section>

      <section className="queue-table-panel">
        <div className="queue-table-panel__header">
          <div>
            <h2>Очередь заявок</h2>
          </div>

          <div className="queue-actions">
            <button
              className={manualModeActive ? "secondary-button" : "ghost-button ghost-button--compact"}
              onClick={() => rebalanceMutation.mutate(expectedQueueVersion)}
              disabled={!canManage || !manualModeActive || rebalanceMutation.isPending}
            >
              {rebalanceMutation.isPending
                ? "Возвращаем автоочередь…"
                : manualModeActive
                  ? "Вернуть автоочередь"
                  : "Автоочередь включена"}
            </button>
          </div>
        </div>

        <div className="queue-toolbar">
          <div className="queue-toolbar__count">
            <span>{snapshot.current ? snapshot.queued.length + 1 : snapshot.queued.length}</span>
            <small>активных заявок</small>
          </div>

          <div className="queue-toolbar__filters" role="tablist" aria-label="Фильтр очереди">
            {[
              ["all", "Все"],
              ["current", "Сейчас"],
              ["queued", "В очереди"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={statusFilter === value ? "toolbar-chip toolbar-chip--active" : "toolbar-chip"}
                onClick={() =>
                  setStatusFilter(value as "all" | "current" | "queued")
                }
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <label className="queue-toolbar__search">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по гостю, Telegram или песне"
            />
          </label>

          <label className="queue-toolbar__sort">
            <span>Сортировка</span>
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)}>
              <option value="position">По позиции</option>
              <option value="guest">По гостю</option>
              <option value="song">По песне</option>
              <option value="wait">По ожиданию</option>
            </select>
          </label>
        </div>

        <SortableQueueList
          currentRequest={statusFilter === "all" || statusFilter === "current" ? snapshot.current : null}
          requests={snapshot.queued}
          filteredRequests={filteredRequests}
          canManage={canManage}
          sungCountByGuestId={sungCountByGuestId}
          onCall={handleCallRequest}
          onMove={handleMoveRequest}
          onDefer={(requestId) => deferMutation.mutate({ requestId, expectedQueueVersion })}
          onCancelGuest={(guestId) => cancelGuestMutation.mutate({ guestId, expectedQueueVersion })}
        />
      </section>
    </div>
  );
}
