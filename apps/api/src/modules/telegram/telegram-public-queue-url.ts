export function getTelegramPublicQueueUrl(channelSlug: string, guestToken?: string | null) {
  const url =
    channelSlug === "secondary"
      ? new URL("https://zapoi.john-doe.ru/")
      : new URL("https://calc1.printninjas.ru/karaoke/queue/mishka");

  if (guestToken) {
    url.searchParams.set("guest", guestToken);
  }

  return url.toString();
}
