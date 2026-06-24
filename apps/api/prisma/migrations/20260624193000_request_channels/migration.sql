-- CreateTable
CREATE TABLE "RequestChannel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestChannel_pkey" PRIMARY KEY ("id")
);

-- Seed default channels. Existing data belongs to the original bot.
INSERT INTO "RequestChannel" ("id", "slug", "name", "color", "isActive", "sortOrder", "updatedAt")
VALUES
  ('channel_main', 'main', 'Основной бот', '#203B47', true, 10, CURRENT_TIMESTAMP),
  ('channel_secondary', 'secondary', 'Второй бот', '#DE7440', true, 20, CURRENT_TIMESTAMP);

-- Add nullable first so existing rows can be backfilled safely.
ALTER TABLE "SongRequest" ADD COLUMN "channelId" TEXT;
ALTER TABLE "TelegramUpdate" ADD COLUMN "channelId" TEXT;

UPDATE "SongRequest" SET "channelId" = 'channel_main' WHERE "channelId" IS NULL;
UPDATE "TelegramUpdate" SET "channelId" = 'channel_main' WHERE "channelId" IS NULL;

ALTER TABLE "SongRequest" ALTER COLUMN "channelId" SET NOT NULL;
ALTER TABLE "TelegramUpdate" ALTER COLUMN "channelId" SET NOT NULL;

-- Existing dedupe was global. With multiple bots it must be per channel.
DROP INDEX "TelegramUpdate_telegramUpdateId_key";

-- CreateIndex
CREATE UNIQUE INDEX "RequestChannel_slug_key" ON "RequestChannel"("slug");
CREATE INDEX "RequestChannel_isActive_sortOrder_idx" ON "RequestChannel"("isActive", "sortOrder");
CREATE INDEX "SongRequest_sessionId_channelId_status_idx" ON "SongRequest"("sessionId", "channelId", "status");
CREATE INDEX "SongRequest_channelId_requestedAt_idx" ON "SongRequest"("channelId", "requestedAt");
CREATE UNIQUE INDEX "TelegramUpdate_channelId_telegramUpdateId_key" ON "TelegramUpdate"("channelId", "telegramUpdateId");
CREATE INDEX "TelegramUpdate_channelId_receivedAt_idx" ON "TelegramUpdate"("channelId", "receivedAt");

-- AddForeignKey
ALTER TABLE "SongRequest" ADD CONSTRAINT "SongRequest_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "RequestChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TelegramUpdate" ADD CONSTRAINT "TelegramUpdate_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "RequestChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
