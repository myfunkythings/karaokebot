export const TELEGRAM_STATUS_BUTTON_TEXT = "Узнать мою позицию";
export const TELEGRAM_CANCEL_BUTTON_TEXT = "Удалить все мои заявки из очереди";

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

export function isTelegramStatusIntent(text: string) {
  const normalized = normalizeStatusIntentText(text);
  return statusCommands.has(normalized);
}

export function isTelegramCancelIntent(text: string) {
  const normalized = normalizeStatusIntentText(text);
  return (
    normalized === "удалить все мои заявки из очереди" ||
    normalized === "/cancel" ||
    normalized === "/delete_my_requests" ||
    normalized === "/удалить_мои_заявки"
  );
}

function normalizeStatusIntentText(text: string) {
  const trimmed = text.trim().toLowerCase().replace(/\s+/g, " ");
  const commandWithoutBotMention = trimmed.replace(/^\/([^@\s]+)@[a-z0-9_]+$/i, "/$1");
  return commandWithoutBotMention;
}
