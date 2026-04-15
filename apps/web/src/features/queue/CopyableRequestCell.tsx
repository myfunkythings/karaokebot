import { useEffect, useState } from "react";
import type { SongRequestDto } from "@karaoke/contracts";

function buildCopyText(request: SongRequestDto) {
  const rawText = request.rawText.trim();
  if (rawText) {
    return `${rawText} караоке`;
  }

  const artist = request.artist?.trim() ?? "";
  const title = request.title?.trim() ?? "";
  return `${artist} - ${title} караоке`;
}

async function writeToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function CopyableRequestCell({
  request,
  canManage,
  onCopied,
  onSave
}: {
  request: SongRequestDto;
  canManage: boolean;
  onCopied: (message: string) => void;
  onSave: (requestId: string, rawText: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(request.rawText);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(request.rawText);
    }
  }, [isEditing, request.rawText]);

  const copyText = buildCopyText(request);

  async function handleCopy() {
    try {
      await writeToClipboard(copyText);
      onCopied(`Скопировано: ${copyText}`);
    } catch (error) {
      console.error(error);
      onCopied("Не удалось скопировать запрос");
    }
  }

  async function handleSave() {
    const normalized = draftValue.trim().replace(/\s+/g, " ");
    if (!normalized || normalized === request.rawText) {
      setDraftValue(request.rawText);
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(request.id, normalized);
      setIsEditing(false);
      onCopied("Заявка обновлена");
    } catch (error) {
      console.error(error);
      onCopied(error instanceof Error ? error.message : "Не удалось обновить заявку");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraftValue(request.rawText);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="copyable-request-cell copyable-request-cell--editing">
        <input
          className="copyable-request-cell__input"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void handleSave();
            }

            if (event.key === "Escape") {
              event.preventDefault();
              handleCancel();
            }
          }}
        />

        <div className="copyable-request-cell__inline-actions">
          <button
            type="button"
            className="copyable-request-cell__icon-button"
            onClick={() => void handleSave()}
            disabled={isSaving || !draftValue.trim()}
            aria-label="Сохранить заявку"
            title="Сохранить"
          >
            ✓
          </button>
          <button
            type="button"
            className="copyable-request-cell__icon-button"
            onClick={handleCancel}
            disabled={isSaving}
            aria-label="Отменить редактирование"
            title="Отменить"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="copyable-request-cell">
      <button
        type="button"
        className="copyable-request-cell__text-button"
        onClick={() => void handleCopy()}
        title={copyText}
      >
        <strong className="copyable-request-cell__title">{request.rawText}</strong>
      </button>

      <div className="copyable-request-cell__inline-actions" aria-hidden="true">
        <button
          type="button"
          className="copyable-request-cell__icon-button"
          onClick={() => void handleCopy()}
          title="Скопировать с “караоке”"
          aria-label="Скопировать заявку"
        >
          ⧉
        </button>
        {canManage ? (
          <button
            type="button"
            className="copyable-request-cell__icon-button"
            onClick={() => setIsEditing(true)}
            title="Редактировать"
            aria-label="Редактировать заявку"
          >
            ✎
          </button>
        ) : null}
      </div>
    </div>
  );
}
