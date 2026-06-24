import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueueSnapshotDto, SongRequestDto } from "@karaoke/contracts";
import { api } from "../../shared/api/client";
import { CopyToast } from "./CopyToast";
import { buildKaraokeCopyText, writeTextToClipboard } from "./InlineEditableRequestText";
import { QueueTable } from "./QueueTable";

export function HostPanelPage({
  snapshot,
  canManage,
  searchValue,
  selectedChannelSlug,
  onChannelChange
}: {
  snapshot: QueueSnapshotDto;
  canManage: boolean;
  searchValue: string;
  selectedChannelSlug: string;
  onChannelChange: (channelSlug: string) => void;
}) {
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refreshEverything = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["stats", "active"] })
    ]);
  };

  const nextMutation = useMutation({
    mutationFn: () => api.nextPerformer(selectedChannelSlug),
    onSuccess: refreshEverything
  });
  const callRequestMutation = useMutation({
    mutationFn: api.callRequest,
    onSuccess: refreshEverything
  });
  const deferMutation = useMutation({
    mutationFn: api.deferRequest,
    onSuccess: refreshEverything
  });
  const cancelGuestMutation = useMutation({
    mutationFn: (guestId: string) => api.cancelGuestFuture(guestId, selectedChannelSlug),
    onSuccess: refreshEverything
  });
  const moveMutation = useMutation({
    mutationFn: ({ requestId, position }: { requestId: string; position: number }) =>
      api.moveRequest(requestId, position),
    onSuccess: refreshEverything
  });
  const updateRequestRawTextMutation = useMutation({
    mutationFn: ({ requestId, rawText }: { requestId: string; rawText: string }) =>
      api.updateRequestRawText(requestId, { rawText }),
    onSuccess: refreshEverything
  });
  const undoMutation = useMutation({
    mutationFn: api.undoLastAction,
    onSuccess: refreshEverything
  });

  const queueSearch = searchValue.trim().toLowerCase();
  const filteredRequests = useMemo(() => {
    if (!queueSearch) {
      return snapshot.queued;
    }

    return snapshot.queued.filter((item) => {
      const guestHandle = item.guest.telegramUsername ? `@${item.guest.telegramUsername}` : "";
      return [item.rawText, item.guest.displayName, guestHandle].some((value) =>
        value.toLowerCase().includes(queueSearch)
      );
    });
  }, [queueSearch, snapshot.queued]);
  const sungCountByGuestId = snapshot.archive.reduce<Record<string, number>>((accumulator, item) => {
    if (item.outcome === "sung") {
      accumulator[item.guest.id] = (accumulator[item.guest.id] ?? 0) + 1;
    }
    return accumulator;
  }, {});
  const nextActionDisabled =
    !canManage || !snapshot.session || (!snapshot.current && !snapshot.queued.length) || nextMutation.isPending;

  useEffect(() => {
    function handleHotkeys(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (event.key.toLowerCase() === "n" && !isTyping && !nextActionDisabled) {
        event.preventDefault();
        handleCallNext();
      }
    }

    window.addEventListener("keydown", handleHotkeys);
    return () => window.removeEventListener("keydown", handleHotkeys);
  }, [nextActionDisabled, snapshot.current, snapshot.queued.length]);

  async function copyRequestForCall(rawText: string) {
    const copiedValue = buildKaraokeCopyText(rawText);

    try {
      await writeTextToClipboard(copiedValue);
      setToastMessage(`Скопировано: ${copiedValue}`);
    } catch (error) {
      console.error(error);
      setToastMessage("Не удалось скопировать заявку");
    }
  }

  function handleCallRequest(request: SongRequestDto) {
    const requestExists = snapshot.queued.some((item) => item.id === request.id);
    if (!requestExists) {
      return;
    }

    void copyRequestForCall(request.rawText);
    callRequestMutation.mutate(request.id);
  }

  function handleCallNext() {
    if (!snapshot.session || (!snapshot.current && !snapshot.queued.length)) {
      return;
    }

    const nextRequest = snapshot.queued[0] ?? null;
    if (nextRequest) {
      void copyRequestForCall(nextRequest.rawText);
    }

    nextMutation.mutate();
  }

  function handleMoveRequest(requestId: string, currentPosition: number) {
    const nextPosition = window.prompt("Новая позиция в очереди", String(currentPosition));
    if (!nextPosition) {
      return;
    }

    const parsedPosition = Number(nextPosition);
    if (!Number.isInteger(parsedPosition) || parsedPosition < 1) {
      window.alert("Введите корректный номер позиции.");
      return;
    }

    moveMutation.mutate({ requestId, position: parsedPosition });
  }

  function handleNoShow(guestName: string, guestId: string) {
    const confirmed = window.confirm(`Отметить, что ${guestName} не дошёл(а), и снять будущие заявки?`);
    if (confirmed) {
      cancelGuestMutation.mutate(guestId);
    }
  }

  return (
    <div className="host-panel-page">
      <section className="operational-toolbar">
        <div className="operational-toolbar__summary" aria-label="Статус смены">
          <span className={snapshot.session ? "operational-pill operational-pill--live" : "operational-pill"}>
            {snapshot.session ? "Смена идёт" : "Смена не открыта"}
          </span>
          <div className="operational-toolbar__facts">
            <div className="operational-toolbar__fact">
              <span>В очереди</span>
              <strong>{snapshot.queued.length}</strong>
            </div>
            <div className="operational-toolbar__fact">
              <span>Канал</span>
              <strong>
                {snapshot.channels.find((channel) => channel.slug === selectedChannelSlug)?.name ?? "Основной"}
              </strong>
            </div>
          </div>
        </div>

        <div className="operational-toolbar__actions">
          <button
            className="primary-button primary-button--toolbar"
            onClick={handleCallNext}
            disabled={nextActionDisabled}
            type="button"
            title="Горячая клавиша: N"
          >
            {nextMutation.isPending ? "Вызываем..." : "Следующая песня"}
          </button>
          <button
            className="secondary-button secondary-button--toolbar"
            onClick={() => undoMutation.mutate()}
            disabled={!canManage || undoMutation.isPending}
            type="button"
          >
            {undoMutation.isPending ? "Отменяем..." : "Отменить последнее действие"}
          </button>
        </div>
      </section>

      {snapshot.channels.length > 1 ? (
        <section className="channel-switcher" aria-label="Канал заявок">
          {snapshot.channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              className={
                channel.slug === selectedChannelSlug
                  ? "channel-switcher__button channel-switcher__button--active"
                  : "channel-switcher__button"
              }
              onClick={() => onChannelChange(channel.slug)}
            >
              <span
                className="channel-switcher__dot"
                style={{ background: channel.color ?? "#58707b" }}
                aria-hidden="true"
              />
              {channel.name}
            </button>
          ))}
        </section>
      ) : null}

      <section className="queue-panel">
        <QueueTable
          currentRequest={snapshot.current}
          requests={filteredRequests}
          sungCountByGuestId={sungCountByGuestId}
          canManage={canManage}
          onCall={handleCallRequest}
          onDefer={(requestId) => deferMutation.mutate(requestId)}
          onReorder={(requestId, position) => moveMutation.mutate({ requestId, position })}
          onMove={(request) => handleMoveRequest(request.id, snapshot.queued.findIndex((item) => item.id === request.id) + 1)}
          onNoShow={(request) => handleNoShow(request.guest.displayName, request.guest.id)}
          onCopied={setToastMessage}
          onSaveRequestText={async (requestId, rawText) => {
            await updateRequestRawTextMutation.mutateAsync({ requestId, rawText });
          }}
          movePending={moveMutation.isPending || callRequestMutation.isPending}
          dragDisabled={Boolean(queueSearch)}
        />
      </section>

      <CopyToast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
