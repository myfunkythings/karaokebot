import { createHmac, timingSafeEqual } from "node:crypto";

export function createPublicQueueGuestToken(input: {
  channelSlug: string;
  telegramUserId: string;
  secret: string;
}) {
  return createHmac("sha256", input.secret)
    .update(`${input.channelSlug}:${input.telegramUserId}`)
    .digest("base64url");
}

export function isPublicQueueGuestTokenValid(input: {
  token: string;
  channelSlug: string;
  telegramUserId: string;
  secret: string;
}) {
  const expected = createPublicQueueGuestToken(input);
  const tokenBuffer = Buffer.from(input.token);
  const expectedBuffer = Buffer.from(expected);

  if (tokenBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(tokenBuffer, expectedBuffer);
}
