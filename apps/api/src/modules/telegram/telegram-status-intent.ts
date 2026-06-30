export const TELEGRAM_STATUS_BUTTON_TEXT = "Узнать мою позицию";
export const TELEGRAM_VIEW_QUEUE_BUTTON_TEXT = "Посмотреть очередь";
export const TELEGRAM_CANCEL_BUTTON_TEXT = "Удалить все мои заявки из очереди";
export const TELEGRAM_CONFIRM_CANCEL_BUTTON_TEXT = "Да, удалить мои заявки";
export const TELEGRAM_ABORT_CANCEL_BUTTON_TEXT = "Не удалять";

const statusCommands = new Set([
  "/status",
  "/position",
  "/queue",
  "/позиция",
  "/моя_позиция",
  "status",
  "position",
  "queue",
  "позиция",
  "узнать мою позицию",
  "моя позиция",
  "моя_позиция",
  "мой статус"
]);

export function isTelegramStatusIntent(text: string, customTexts: string[] = []) {
  const normalized = normalizeStatusIntentText(text);
  return statusCommands.has(normalized) || normalizedTexts(customTexts).has(normalized);
}

export function isTelegramCancelRequestIntent(text: string, customTexts: string[] = []) {
  const normalized = normalizeStatusIntentText(text);
  return normalized === "удалить все мои заявки из очереди" || normalizedTexts(customTexts).has(normalized);
}

export function isTelegramViewQueueIntent(text: string, customTexts: string[] = []) {
  const normalized = normalizeStatusIntentText(text);
  return normalized === "посмотреть очередь" || normalized === "/queue" || normalizedTexts(customTexts).has(normalized);
}

export function isTelegramCancelConfirmIntent(text: string, customTexts: string[] = []) {
  const normalized = normalizeStatusIntentText(text);
  return (
    normalized === "да, удалить мои заявки" ||
    normalized === "/cancel" ||
    normalized === "/delete_my_requests" ||
    normalized === "/удалить_мои_заявки" ||
    normalizedTexts(customTexts).has(normalized)
  );
}

export function isTelegramCancelAbortIntent(text: string, customTexts: string[] = []) {
  const normalized = normalizeStatusIntentText(text);
  return normalized === "не удалять" || normalizedTexts(customTexts).has(normalized);
}

function normalizeStatusIntentText(text: string) {
  const trimmed = text.trim().toLowerCase().replace(/\s+/g, " ");
  const commandWithoutBotMention = trimmed.replace(/^\/([^@\s]+)@[a-z0-9_]+$/i, "/$1");
  return commandWithoutBotMention;
}

function normalizedTexts(texts: string[]) {
  return new Set(texts.filter(Boolean).map(normalizeStatusIntentText));
}
