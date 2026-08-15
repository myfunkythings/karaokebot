import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { useUiCopy } from "../../shared/ui/ui-copy";

export function ManualRequestForm({
  canManage,
  channelSlug
}: {
  canManage: boolean;
  channelSlug: string;
}) {
  const text = useUiCopy();
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
      rawText,
      channelSlug
    });
  }

  return (
    <section className="sidebar-card">
      <div className="sidebar-card__header">
        <h2>{text("queue.addTitle")}</h2>
      </div>

      <form className="manual-request-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>{text("queue.addGuestLabel")}</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={text("queue.addGuestPlaceholder")}
            disabled={!canManage}
          />
        </label>

        <label className="field">
          <span>{text("queue.addRequestLabel")}</span>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={text("queue.addRequestPlaceholder")}
            disabled={!canManage}
            rows={4}
          />
        </label>

        <button
          className="secondary-button secondary-button--block"
          type="submit"
          disabled={!canManage || mutation.isPending || !displayName.trim() || !rawText.trim()}
        >
          {mutation.isPending ? text("queue.addSubmitPending") : text("queue.addSubmit")}
        </button>
      </form>
    </section>
  );
}
