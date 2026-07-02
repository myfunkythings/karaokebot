import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionCard } from "@karaoke/ui";
import type { GlobalSettings } from "@karaoke/contracts";
import { api } from "../../shared/api/client";

const botReplyFields: Array<{
  key: keyof GlobalSettings["botReplyTemplates"];
  label: string;
}> = [
  { key: "startMessage", label: "Сообщение на /start" },
  { key: "unknownCommand", label: "Ответ на неизвестную команду" },
  { key: "emptyMessage", label: "Ответ на пустое сообщение" },
  { key: "requestAccepted", label: "Текст при успешной заявке (`{{title}}`, `{{position}}`)" },
  { key: "requestRejectedRateLimit", label: "Текст при антиспаме" },
  { key: "requestRejectedNoSession", label: "Текст при закрытом приёме заявок" },
  { key: "statusCurrentPerformer", label: "Статус: пользователь уже у сцены" },
  { key: "statusNoGuestProfile", label: "Статус: у пользователя ещё не было заявок" },
  { key: "statusNoActiveRequests", label: "Статус: в активной смене заявок нет" },
  {
    key: "statusQueuedSummary",
    label: "Статус: заявка в очереди (`{{title}}`, `{{position}}`)"
  },
  {
    key: "fallbackPositionUnavailable",
    label: "Fallback: не удалось показать позицию"
  },
  {
    key: "fallbackRequestSaveFailed",
    label: "Fallback: не удалось сохранить заявку"
  },
  { key: "fallbackStatusNoRequests", label: "Fallback: в очереди нет заявок" },
  {
    key: "fallbackStatusNoActiveRequests",
    label: "Fallback: у пользователя нет активных заявок"
  },
  {
    key: "fallbackStatusQueuedSummary",
    label: "Fallback: успешная заявка (`{{queue_tail}}`)"
  },
  {
    key: "fallbackStatusQueuedNoAhead",
    label: "Fallback: перед пользователем никого нет"
  },
  {
    key: "fallbackStatusQueuedAheadTemplate",
    label: "Fallback: перед пользователем есть очередь (`{{before}}`)"
  },
  { key: "telegramStatusButtonText", label: "Telegram-кнопка: узнать позицию" },
  { key: "telegramViewQueueButtonText", label: "Telegram-кнопка: посмотреть очередь" },
  { key: "telegramCancelButtonText", label: "Telegram-кнопка: удалить заявки" },
  { key: "telegramCancelConfirmButtonText", label: "Telegram-кнопка: подтвердить удаление" },
  { key: "telegramCancelAbortButtonText", label: "Telegram-кнопка: не удалять" },
  {
    key: "telegramViewQueueReplyTemplate",
    label: "Telegram-ответ со ссылкой на очередь (`{{url}}`)"
  },
  {
    key: "telegramCancelConfirmationMessage",
    label: "Telegram-ответ: подтверждение удаления"
  },
  {
    key: "telegramCancelAbortMessage",
    label: "Telegram-ответ: отмена удаления"
  },
  {
    key: "telegramNextSongNotification",
    label: "Telegram-уведомление: песня следующая"
  }
];

export function SettingsPanel({
  settings,
  canEdit
}: {
  settings: GlobalSettings;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "global"] });
    }
  });

  return (
    <SectionCard title="Настройки">
      <div className="stack">
        <label className="field">
          <span>Антиспам, сек</span>
          <input
            type="number"
            value={draft.antiSpamSeconds}
            disabled={!canEdit}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                antiSpamSeconds: Number(event.target.value)
              }))
            }
          />
        </label>
        <label className="field">
          <span>На сколько позиций переносить отложенную заявку вниз</span>
          <input
            type="number"
            value={draft.skipDownPositions}
            disabled={!canEdit}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                skipDownPositions: Number(event.target.value)
              }))
            }
          />
        </label>
        {botReplyFields.map(({ key, label }) => (
          <label className="field" key={key}>
            <span>{label}</span>
            <textarea
              value={draft.botReplyTemplates[key]}
              disabled={!canEdit}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  botReplyTemplates: {
                    ...current.botReplyTemplates,
                    [key]: event.target.value
                  }
                }))
              }
            />
          </label>
        ))}
        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={draft.queuePolicyFlags.prioritizeFirstTimeSinger}
            disabled={!canEdit}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                queuePolicyFlags: {
                  ...current.queuePolicyFlags,
                  prioritizeFirstTimeSinger: event.target.checked
                }
              }))
            }
          />
          <span>Приоритет тем, кто ещё не пел</span>
        </label>
        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={draft.queuePolicyFlags.prioritizeLowerSungCount}
            disabled={!canEdit}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                queuePolicyFlags: {
                  ...current.queuePolicyFlags,
                  prioritizeLowerSungCount: event.target.checked
                }
              }))
            }
          />
          <span>Приоритет по меньшему количеству исполнений</span>
        </label>
        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={draft.queuePolicyFlags.prioritizeRequestTime}
            disabled={!canEdit}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                queuePolicyFlags: {
                  ...current.queuePolicyFlags,
                  prioritizeRequestTime: event.target.checked
                }
              }))
            }
          />
          <span>Учитывать время поступления заявки</span>
        </label>
        <button
          className="primary-button"
          onClick={() => mutation.mutate(draft)}
          disabled={!canEdit || mutation.isPending}
        >
          {mutation.isPending ? "Сохраняем…" : "Сохранить настройки"}
        </button>
      </div>
    </SectionCard>
  );
}
