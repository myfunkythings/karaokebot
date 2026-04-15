-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('owner', 'host', 'viewer');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'active', 'closed');

-- CreateEnum
CREATE TYPE "SongRequestSource" AS ENUM ('telegram', 'manual');

-- CreateEnum
CREATE TYPE "SongRequestStatus" AS ENUM ('queued', 'current', 'sung', 'cancelled');

-- CreateEnum
CREATE TYPE "SongRequestOutcome" AS ENUM ('sung', 'cancelled_by_host', 'left_venue', 'undone');

-- CreateEnum
CREATE TYPE "OrderMode" AS ENUM ('auto', 'manual_pin');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('staff', 'system', 'telegram');

-- CreateEnum
CREATE TYPE "TelegramUpdateProcessingStatus" AS ENUM ('accepted', 'ignored', 'duplicate', 'error');

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestProfile" (
    "id" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "telegramUsername" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT NOT NULL,
    "normalizedDisplayName" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'draft',
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL,
    "configSnapshotJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByStaffId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongRequest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "source" "SongRequestSource" NOT NULL,
    "telegramUpdateId" TEXT,
    "telegramMessageId" TEXT,
    "rawText" TEXT NOT NULL,
    "artist" TEXT,
    "title" TEXT,
    "status" "SongRequestStatus" NOT NULL DEFAULT 'queued',
    "outcome" "SongRequestOutcome",
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "queueRank" INTEGER,
    "orderMode" "OrderMode" NOT NULL DEFAULT 'auto',
    "manualRank" INTEGER,
    "deferCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramUpdate" (
    "id" TEXT NOT NULL,
    "telegramUpdateId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "telegramMessageId" TEXT,
    "guestProfileId" TEXT,
    "rawPayloadJson" JSONB NOT NULL,
    "processingStatus" "TelegramUpdateProcessingStatus" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "linkedSongRequestId" TEXT,
    "errorText" TEXT,

    CONSTRAINT "TelegramUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "updatedByStaffId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorStaffId" TEXT,
    "actorGuestId" TEXT,
    "actionType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "inversePayloadJson" JSONB,
    "isUndoable" BOOLEAN NOT NULL DEFAULT false,
    "undoneByActionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionGuestStat" (
    "sessionId" TEXT NOT NULL,
    "guestProfileId" TEXT NOT NULL,
    "requestsCount" INTEGER NOT NULL DEFAULT 0,
    "sungCount" INTEGER NOT NULL DEFAULT 0,
    "deferCount" INTEGER NOT NULL DEFAULT 0,
    "cancelledCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionGuestStat_pkey" PRIMARY KEY ("sessionId","guestProfileId")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_login_key" ON "StaffUser"("login");

-- CreateIndex
CREATE UNIQUE INDEX "GuestProfile_telegramUserId_key" ON "GuestProfile"("telegramUserId");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "SongRequest_sessionId_status_idx" ON "SongRequest"("sessionId", "status");

-- CreateIndex
CREATE INDEX "SongRequest_sessionId_queueRank_idx" ON "SongRequest"("sessionId", "queueRank");

-- CreateIndex
CREATE INDEX "SongRequest_guestProfileId_requestedAt_idx" ON "SongRequest"("guestProfileId", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramUpdate_telegramUpdateId_key" ON "TelegramUpdate"("telegramUpdateId");

-- CreateIndex
CREATE INDEX "TelegramUpdate_guestProfileId_idx" ON "TelegramUpdate"("guestProfileId");

-- CreateIndex
CREATE INDEX "TelegramUpdate_linkedSongRequestId_idx" ON "TelegramUpdate"("linkedSongRequestId");

-- CreateIndex
CREATE INDEX "ActionLog_sessionId_createdAt_idx" ON "ActionLog"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionLog_isUndoable_createdAt_idx" ON "ActionLog"("isUndoable", "createdAt");

-- CreateIndex
CREATE INDEX "SessionGuestStat_sessionId_sungCount_idx" ON "SessionGuestStat"("sessionId", "sungCount");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "StaffUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongRequest" ADD CONSTRAINT "SongRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongRequest" ADD CONSTRAINT "SongRequest_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "GuestProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramUpdate" ADD CONSTRAINT "TelegramUpdate_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramUpdate" ADD CONSTRAINT "TelegramUpdate_linkedSongRequestId_fkey" FOREIGN KEY ("linkedSongRequestId") REFERENCES "SongRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_updatedByStaffId_fkey" FOREIGN KEY ("updatedByStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_actorStaffId_fkey" FOREIGN KEY ("actorStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_actorGuestId_fkey" FOREIGN KEY ("actorGuestId") REFERENCES "GuestProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_undoneByActionId_fkey" FOREIGN KEY ("undoneByActionId") REFERENCES "ActionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionGuestStat" ADD CONSTRAINT "SessionGuestStat_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionGuestStat" ADD CONSTRAINT "SessionGuestStat_guestProfileId_fkey" FOREIGN KEY ("guestProfileId") REFERENCES "GuestProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
