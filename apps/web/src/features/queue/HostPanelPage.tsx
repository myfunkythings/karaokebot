import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueueSnapshotDto, SongRequestDto } from "@karaoke/contracts";
import { api } from "../../shared/api/client";
import { CopyToast } from "./CopyToast";
import { buildKaraokeCopyText, writeTextToClipboard } from "./InlineEditableRequestText";
import { QueueTable } from "./QueueTable";
import { useUiCopy } from "../../shared/ui/ui-copy";

export function HostPanelPage({
  snapshot,
  canManage,
  searchValue,
  onSearchChange,
  onClearSearch
}: {
  snapshot: QueueSnapshotDto;
  canManage: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}) {
  const text = useUiCopy();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const refreshEverything = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["stats", "active"] })
    ]);
  };
  const handleMutationError = (error: Error) => {
    setConflictMessage(error.message);
    void queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] });
  };
  const getExpectedQueueVersion = () => {
    if (!snapshot.queueVersion) {
      throw new Error("Смена не открыта");
    }
    return snapshot.queueVersion;
  };

  const nextMutation = useMutation({
    mutationFn: (expectedQueueVersion: number) =>
      api.nextPerformer(expectedQueueVersion, snapshot.activeChannelSlug),
    onSuccess: refreshEverything,
    onError: handleMutationError
  });
  const callRequestMutation = useMutation({
    mutationFn: ({ requestId, expectedQueueVersion }: { requestId: string; expectedQueueVersion: number }) =>
      api.callRequest(requestId, expectedQueueVersion),
    onSuccess: refreshEverything,
    onError: handleMutationError
  });
  const deferMutation = useMutation({
    mutationFn: ({ requestId, expectedQueueVersion }: { requestId: string; expectedQueueVersion: number }) =>
      api.deferRequest(requestId, expectedQueueVersion),
    onSuccess: refreshEverything,
    onError: handleMutationError
  });
  const cancelGuestMutation = useMutation({
    mutationFn: ({ guestId, expectedQueueVersion }: { guestId: string; expectedQueueVersion: number }) =>
      api.cancelGuestFuture(guestId, expectedQueueVersion, snapshot.activeChannelSlug),
    onSuccess: refreshEverything,
    onError: handleMutationError
  });
  const moveMutation = useMutation({
    mutationFn: ({
      requestId,
      position,
      expectedQueueVersion
    }: {
      requestId: string;
      position: number;
      expectedQueueVersion: number;
    }) =>
      api.moveRequest(requestId, position, expectedQueueVersion),
    onSuccess: refreshEverything,
    onError: handleMutationError
  });
  const updateRequestRawTextMutation = useMutation({
    mutationFn: ({ requestId, rawText }: { requestId: string; rawText: string }) =>
      api.updateRequestRawText(requestId, { rawText }),
    onSuccess: refreshEverything
  });
  const undoMutation = useMutation({
    mutationFn: (expectedQueueVersion: number) =>
      api.undoLastAction(expectedQueueVersion, snapshot.activeChannelSlug),
    onSuccess: refreshEverything,
    onError: handleMutationError
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
  const nextRequest = snapshot.queued[0] ?? null;
  const nextActionDisabled =
    !canManage || !snapshot.session || (!snapshot.current && !snapshot.queued.length) || nextMutation.isPending;

  function getRequestSongLabel(request: SongRequestDto | null) {
    if (!request) {
      return "Сцена свободна";
    }

    if (request.artist && request.title) {
      return `${request.artist} - ${request.title}`;
    }

    return request.title ?? request.rawText;
  }

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
      setToastMessage(text("queue.copySuccess", { request: copiedValue }));
    } catch (error) {
      console.error(error);
      setToastMessage(text("queue.copyError"));
    }
  }

  function handleCallRequest(request: SongRequestDto) {
    const requestExists = snapshot.queued.some((item) => item.id === request.id);
    if (!requestExists) {
      return;
    }

    void copyRequestForCall(request.rawText);
    callRequestMutation.mutate({
      requestId: request.id,
      expectedQueueVersion: getExpectedQueueVersion()
    });
  }

  function handleCallNext() {
    if (!snapshot.session || (!snapshot.current && !snapshot.queued.length)) {
      return;
    }

    const nextRequest = snapshot.queued[0] ?? null;
    if (nextRequest) {
      void copyRequestForCall(nextRequest.rawText);
    }

    nextMutation.mutate(getExpectedQueueVersion());
  }

  function handleMoveRequest(requestId: string, currentPosition: number) {
    const nextPosition = window.prompt(text("queue.movePrompt"), String(currentPosition));
    if (!nextPosition) {
      return;
    }

    const parsedPosition = Number(nextPosition);
    if (!Number.isInteger(parsedPosition) || parsedPosition < 1) {
      window.alert(text("queue.moveInvalid"));
      return;
    }

    moveMutation.mutate({
      requestId,
      position: parsedPosition,
      expectedQueueVersion: getExpectedQueueVersion()
    });
  }

  function handleNoShow(guestName: string, guestId: string) {
    const confirmed = window.confirm(text("queue.noShowConfirm", { guest: guestName }));
    if (confirmed) {
      cancelGuestMutation.mutate({
        guestId,
        expectedQueueVersion: getExpectedQueueVersion()
      });
    }
  }

  return (
    <div className="host-panel-page">
      <section
        className={
          snapshot.channels.length > 1
            ? "host-console-bar"
            : "host-console-bar host-console-bar--single-channel"
        }
      >
        <div className="host-console-bar__admin">
          <span>{text("admin.label")}</span>
          <strong>
            {snapshot.channels.find((channel) => channel.slug === snapshot.activeChannelSlug)?.name ?? text("admin.defaultChannel")}
          </strong>
        </div>

        <div className="queue-panel__controls">
          <label className="queue-search">
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={text("queue.searchPlaceholder")}
              aria-label={text("queue.searchLabel")}
            />
          </label>
          <span className="queue-count-chip">
            {queueSearch
              ? text("admin.queueCount", { shown: filteredRequests.length, total: snapshot.queued.length })
              : text("admin.queueCountSingle", { count: snapshot.queued.length })}
          </span>
          {queueSearch ? (
            <button className="ghost-button ghost-button--compact" onClick={onClearSearch} type="button">
              {text("queue.clearSearch")}
            </button>
          ) : null}
        </div>

        <div className="operational-toolbar__facts">
          <div className="operational-toolbar__fact">
            <span>{text("admin.nowLabel")}</span>
            <strong>{snapshot.current?.guest.displayName ?? text("admin.stageFree")}</strong>
            <small className="operational-toolbar__fact-meta">{getRequestSongLabel(snapshot.current)}</small>
          </div>
          <div className="operational-toolbar__fact">
            <span>{text("admin.nextLabel")}</span>
            <strong>{nextRequest?.guest.displayName ?? text("admin.queueEmpty")}</strong>
            <small className="operational-toolbar__fact-meta">{getRequestSongLabel(nextRequest)}</small>
          </div>
        </div>
        <div className="operational-toolbar__actions">
          <button
            className="secondary-button secondary-button--toolbar"
            onClick={() => undoMutation.mutate(getExpectedQueueVersion())}
            disabled={!canManage || undoMutation.isPending}
            type="button"
          >
            {undoMutation.isPending ? text("queue.undoPending") : text("queue.undo")}
          </button>
          <button
            className="primary-button primary-button--toolbar"
            onClick={handleCallNext}
            disabled={nextActionDisabled}
            type="button"
            title={
              snapshot.current
                ? text("admin.nextTitleCurrent")
                : text("admin.nextTitleEmpty")
            }
          >
            {nextMutation.isPending ? text("queue.nextSongPending") : text("queue.nextSong")}
          </button>
        </div>
      </section>

      {conflictMessage ? (
        <section className="operator-conflict-banner">
          <span>{conflictMessage}</span>
          <button type="button" onClick={() => setConflictMessage(null)}>
            {text("admin.conflictDismiss")}
          </button>
        </section>
      ) : null}

      <section className="queue-panel">
        <QueueTable
          currentRequest={snapshot.current}
          requests={filteredRequests}
          sungCountByGuestId={sungCountByGuestId}
          canManage={canManage}
          onCall={handleCallRequest}
          onDefer={(requestId) =>
            deferMutation.mutate({
              requestId,
              expectedQueueVersion: getExpectedQueueVersion()
            })
          }
          onReorder={(requestId, position) =>
            moveMutation.mutate({
              requestId,
              position,
              expectedQueueVersion: getExpectedQueueVersion()
            })
          }
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
