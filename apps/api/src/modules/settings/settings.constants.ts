import type { GlobalSettings } from "@karaoke/contracts";

export const DEFAULT_SETTINGS: GlobalSettings = {
  antiSpamSeconds: 300,
  skipDownPositions: 3,
  queuePolicyFlags: {
    prioritizeFirstTimeSinger: true,
    prioritizeLowerSungCount: true,
    prioritizeRequestTime: true
  },
  botReplyTemplates: {
    startMessage:
      "Привет! Отправь сообщение в формате исполнитель + песня, и заявка попадёт ведущему.",
    unknownCommand:
      "Не понял команду. Просто отправь сообщение с исполнителем и песней, например: Кино - Пачка сигарет.",
    emptyMessage: "Пришлите, пожалуйста, исполнителя и название песни.",
    requestAccepted:
      "Заявка принята. Если ведущий не успеет распознать песню, он уточнит её в админ-панели.",
    requestRejectedRateLimit:
      "Слишком часто. Подожди немного и отправь заявку ещё раз.",
    requestRejectedNoSession:
      "Сейчас приём заявок закрыт. Попробуй чуть позже, когда ведущий откроет смену.",
    statusCurrentPerformer: "Ты сейчас поёшь или уже на подходе к сцене.",
    statusNoGuestProfile: "У тебя пока нет активных заявок.",
    statusNoActiveRequests: "У тебя сейчас нет заявок в активной смене.",
    statusQueuedSummary:
      "Ты в очереди. Следи за сценой и подходи, когда тебя позовут.\n\nТекущая заявка: {{title}}\nПесен перед вами: {{position}} {{trackPlural}}.",
    fallbackPositionUnavailable:
      "Не удалось получить позицию: сейчас недоступны и новая программа, и Google Sheets.",
    fallbackRequestSaveFailed:
      "Не удалось сохранить заявку: недоступны и новая программа, и Google Sheets.",
    fallbackStatusNoRequests: "Сейчас заявок нет.",
    fallbackStatusNoActiveRequests: "Сейчас ваших активных заявок нет.",
    fallbackStatusQueuedSummary:
      "🎶 Ваша заявка принята!\n\n👉 В очереди приоритет у тех, кто ещё не пел, потом у тех, кто спел меньше песен, и только потом учитывается время заявки. Так что система старается, чтобы все успели спеть.\n\n⏳ {{queue_tail}}",
    fallbackStatusQueuedNoAhead: "Прямо сейчас активных заявок перед вами нет.",
    fallbackStatusQueuedAheadTemplate: "Перед вами сейчас примерно {{before}} заявок.",
    telegramStatusButtonText: "Узнать мою позицию",
    telegramViewQueueButtonText: "Посмотреть очередь",
    telegramCancelButtonText: "Удалить все мои заявки из очереди",
    telegramCancelConfirmButtonText: "Да, удалить мои заявки",
    telegramCancelAbortButtonText: "Не удалять",
    telegramViewQueueReplyTemplate: "Публичная очередь: {{url}}",
    telegramCancelConfirmationMessage:
      "Точно удалить все твои заявки из очереди? Это действие нельзя отменить из Telegram.\n\nЕсли нажал случайно, выбери «Не удалять».",
    telegramCancelAbortMessage: "Ок, заявки оставил в очереди.",
    telegramNextSongNotification: "Ваша песня следующая"
  },
  uiLabels: {
    next: "Следующий исполнитель",
    defer: "Пропустить",
    leftVenue: "Человек ушёл",
    undo: "Отменить исполнение"
  }
};
