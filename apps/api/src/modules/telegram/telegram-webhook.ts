export function resolveTelegramWebhookUrl(params: {
  explicitUrl?: string;
  domain?: string;
}) {
  const explicitUrl = params.explicitUrl?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/+$/, "");
  }

  const domain = params.domain?.trim();
  if (!domain) {
    return null;
  }

  const normalizedDomain = domain.match(/^https?:\/\//)
    ? domain.replace(/\/+$/, "")
    : `https://${domain.replace(/\/+$/, "")}`;

  return `${normalizedDomain}/karaoke/api/telegram/webhook`;
}

export function isTelegramWebhookPlaceholder(value?: string) {
  if (!value) {
    return true;
  }

  return (
    value === "replace-me" ||
    value === "change-me-now" ||
    value.startsWith("change-this-") ||
    value.startsWith("replace-me-")
  );
}
