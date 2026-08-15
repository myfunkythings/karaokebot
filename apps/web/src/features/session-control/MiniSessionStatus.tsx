import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueueSnapshotDto, SessionStatsDto } from "@karaoke/contracts";
import { formatDateTime } from "../../shared/lib/format";
import { api } from "../../shared/api/client";
import { useUiCopy } from "../../shared/ui/ui-copy";

export function MiniSessionStatus({
  activeSession,
  snapshot,
  stats,
  canManage
}: {
  activeSession: { id: string; title: string; openedAt: string | null; timezone: string } | null;
  snapshot: QueueSnapshotDto;
  stats: SessionStatsDto | null;
  canManage: boolean;
}) {
  const text = useUiCopy();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const manualModeActive = snapshot.queued.some((item) => item.orderMode === "manual_pin");

  const refreshEverything = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["stats", "active"] })
    ]);
  };

  const openMutation = useMutation({
    mutationFn: api.openSession,
    onSuccess: async () => {
      setTitle("");
      await refreshEverything();
    }
  });

  function handleOpen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openMutation.mutate({ title: title || undefined });
  }

  return (
    <section className="sidebar-card sidebar-card--compact">
      <div className="sidebar-card__header">
        <h2>{text("session.title")}</h2>
      </div>

      {activeSession ? (
        <>
          <div className="mini-status">
            <div className="mini-status__line">
              <span>{text("session.statusLabel")}</span>
              <strong>{text("session.statusActive")}</strong>
            </div>
            <div className="mini-status__line">
              <span>{text("session.nameLabel")}</span>
              <strong>{activeSession.title}</strong>
            </div>
            <div className="mini-status__line">
              <span>{text("session.openedLabel")}</span>
              <strong>{formatDateTime(activeSession.openedAt)}</strong>
            </div>
            <div className="mini-status__line">
              <span>{text("queue.inQueue")}</span>
              <strong>{snapshot.queued.length}</strong>
            </div>
            <div className="mini-status__line">
              <span>{text("session.autoQueueLabel")}</span>
              <strong>{manualModeActive ? text("session.autoQueueManual") : text("session.autoQueueOn")}</strong>
            </div>
            <div className="mini-status__line">
              <span>{text("session.sungLabel")}</span>
              <strong>{stats?.totalSung ?? snapshot.stats.totalSung}</strong>
            </div>
          </div>
        </>
      ) : (
        <form className="mini-status-form" onSubmit={handleOpen}>
          <div className="mini-status mini-status--closed">
            <div className="mini-status__line">
              <span>{text("session.title")}</span>
              <strong>{text("session.closed")}</strong>
            </div>
          </div>
          <label className="field">
            <span>{text("session.nameLabel")}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={text("session.namePlaceholder")}
              disabled={!canManage}
            />
          </label>
          <button className="primary-button primary-button--block" type="submit" disabled={!canManage || openMutation.isPending}>
            {openMutation.isPending ? text("session.openPending") : text("session.open")}
          </button>
        </form>
      )}
    </section>
  );
}
