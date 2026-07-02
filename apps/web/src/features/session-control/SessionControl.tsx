import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionCard } from "@karaoke/ui";
import { formatDateTime } from "../../shared/lib/format";
import { api } from "../../shared/api/client";

export function SessionControl({
  activeSession,
  canManage
}: {
  activeSession: { id: string; title: string; version: number; openedAt: string | null; timezone: string } | null;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");

  const openMutation = useMutation({
    mutationFn: api.openSession,
    onSuccess: async () => {
      setTitle("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["stats", "active"] })
      ]);
    }
  });

  const closeMutation = useMutation({
    mutationFn: api.closeSession,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["stats", "active"] })
      ]);
    }
  });

  function handleOpen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openMutation.mutate({ title: title || undefined });
  }

  function handleClose() {
    const confirmed = window.confirm(
      "Закрыть текущую смену? После этого новые заявки принимать нельзя, а текущая очередь перестанет расти."
    );
    if (confirmed) {
      closeMutation.mutate(activeSession?.version ?? 0);
    }
  }

  if (activeSession) {
    return (
      <SectionCard
        title="Смена"
        actions={
          canManage ? (
            <button
              className="danger-button danger-button--ghost"
              onClick={handleClose}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? "Закрываем…" : "Закрыть смену"}
            </button>
          ) : null
        }
      >
        <div className="session-card">
          <div className="session-card__status">Смена идёт</div>
          <strong className="session-card__title">{activeSession.title}</strong>
          <div className="session-card__meta">
            <span>Открыта: {formatDateTime(activeSession.openedAt)}</span>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Открыть смену">
      <form className="stack" onSubmit={handleOpen}>
        <div className="empty-state empty-state--inline">
          Пока нет активной смены. Откройте её, чтобы принимать заявки и запускать очередь.
        </div>
        <label className="field">
          <span>Название смены</span>
          <input
            value={title}
            placeholder="Например: Караоке пятница"
            onChange={(event) => setTitle(event.target.value)}
            disabled={!canManage}
          />
        </label>
        <button className="primary-button" type="submit" disabled={!canManage || openMutation.isPending}>
          {openMutation.isPending ? "Открываем смену…" : "Открыть смену"}
        </button>
      </form>
    </SectionCard>
  );
}
