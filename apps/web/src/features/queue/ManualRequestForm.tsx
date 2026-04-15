import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";

export function ManualRequestForm({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [rawText, setRawText] = useState("");

  const mutation = useMutation({
    mutationFn: api.createManualRequest,
    onSuccess: async () => {
      setDisplayName("");
      setRawText("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["stats", "active"] })
      ]);
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate({
      displayName,
      rawText
    });
  }

  return (
    <section className="sidebar-card">
      <div className="sidebar-card__header">
        <h2>Добавить заявку</h2>
      </div>

      <form className="manual-request-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Гость</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Например: Аня, стол 4"
            disabled={!canManage}
          />
        </label>

        <label className="field">
          <span>Заявка</span>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Например: emma ruth rundle - living with a black dog"
            disabled={!canManage}
            rows={4}
          />
        </label>

        <button
          className="secondary-button secondary-button--block"
          type="submit"
          disabled={!canManage || mutation.isPending || !displayName.trim() || !rawText.trim()}
        >
          {mutation.isPending ? "Добавляем…" : "Добавить заявку"}
        </button>
      </form>
    </section>
  );
}
