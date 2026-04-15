import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

function buildKaraokeCopyText(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue ? `${trimmedValue} караоке` : "караоке";
}

async function writeTextToClipboard(value: string) {
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

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10.9 2.3a1.5 1.5 0 0 1 2.1 0l.7.7a1.5 1.5 0 0 1 0 2.1L6 12.8l-3.3.6.6-3.3 7.6-7.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="m3.5 8.4 2.8 2.8 6.2-6.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

export function InlineEditableRequestText({
  value,
  onSave,
  className,
  disabled,
  isEditing: controlledEditing,
  onStartEditing,
  onCancelEditing
}: {
  value: string;
  onSave: (nextValue: string) => Promise<void> | void;
  className?: string;
  disabled?: boolean;
  isEditing?: boolean;
  onStartEditing?: () => void;
  onCancelEditing?: () => void;
}) {
  const [internalEditing, setInternalEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const buttonId = useId();
  const isControlled = typeof controlledEditing === "boolean";
  const isEditing = isControlled ? controlledEditing : internalEditing;
  const shouldUseTextarea = draftValue.length > 72 || draftValue.includes("\n");
  const placeholderText = "Пустая заявка";

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    if (shouldUseTextarea) {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(draftValue.length, draftValue.length);
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(draftValue.length, draftValue.length);
  }, [draftValue.length, isEditing, shouldUseTextarea]);

  useLayoutEffect(() => {
    if (!isEditing || !shouldUseTextarea || !textareaRef.current) {
      return;
    }

    const textarea = textareaRef.current;
    textarea.style.height = "0px";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 44), 86);
    textarea.style.height = `${nextHeight}px`;
  }, [draftValue, isEditing, shouldUseTextarea]);

  function openEditing() {
    if (disabled) {
      return;
    }

    if (!isControlled) {
      setInternalEditing(true);
    }
    onStartEditing?.();
  }

  function closeEditing() {
    if (!isControlled) {
      setInternalEditing(false);
    }
    onCancelEditing?.();
  }

  async function handleSave() {
    const normalizedValue = draftValue.trim();

    if (!normalizedValue) {
      setDraftValue(value);
      closeEditing();
      return;
    }

    if (normalizedValue === value) {
      closeEditing();
      return;
    }

    try {
      setIsSaving(true);
      await onSave(normalizedValue);
      closeEditing();
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraftValue(value);
    closeEditing();
  }

  function renderEditor() {
    if (shouldUseTextarea) {
      return (
        <textarea
          ref={textareaRef}
          className="inline-request-text__textarea"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={() => void handleSave()}
          rows={2}
          aria-labelledby={buttonId}
          disabled={isSaving}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              handleCancel();
            }

            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSave();
            }
          }}
        />
      );
    }

    return (
      <input
        ref={inputRef}
        className="inline-request-text__input"
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={() => void handleSave()}
        aria-labelledby={buttonId}
        disabled={isSaving}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            handleCancel();
          }

          if (event.key === "Enter") {
            event.preventDefault();
            void handleSave();
          }
        }}
      />
    );
  }

  return (
    <div className={className ? `inline-request-text ${className}` : "inline-request-text"}>
      {isEditing ? (
        <div className="inline-request-text__editor">
          {renderEditor()}
          <div className="inline-request-text__actions">
            <button
              type="button"
              className="inline-request-text__icon-button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void handleSave()}
              disabled={isSaving || !draftValue.trim()}
              aria-label="Сохранить заявку"
              title="Сохранить"
            >
              <CheckIcon />
            </button>
            <button
              type="button"
              className="inline-request-text__icon-button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleCancel}
              disabled={isSaving}
              aria-label="Отменить редактирование"
              title="Отменить"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : (
        <div className="inline-request-text__view">
          <button
            id={buttonId}
            type="button"
            className="inline-request-text__copy-button"
            onClick={openEditing}
            disabled={disabled}
            title="Редактировать заявку"
          >
            <span className={value.trim() ? "inline-request-text__value" : "inline-request-text__value inline-request-text__value--placeholder"}>
              {value.trim() || placeholderText}
            </span>
          </button>

          {!disabled ? (
            <div className="inline-request-text__actions">
              <button
                type="button"
                className="inline-request-text__icon-button"
                onClick={openEditing}
                aria-label="Редактировать заявку"
                title="Редактировать"
              >
                <PencilIcon />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export { buildKaraokeCopyText, writeTextToClipboard };
