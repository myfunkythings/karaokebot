export function getTelegramPublicQueueUrl(channelSlug: string, guestToken?: string | null) {
  const url = new URL(
    channelSlug === "secondary"
      ? "https://zapoi.john-doe.ru/"
      : channelSlug === "petya"
        ? "https://calc1.printninjas.ru/karaoke-petya/queue"
        : "https://calc1.printninjas.ru/karaoke/queue/mishka"
  );

  if (guestToken) {
    url.searchParams.set("guest", guestToken);
  }

  return url.toString();
}
