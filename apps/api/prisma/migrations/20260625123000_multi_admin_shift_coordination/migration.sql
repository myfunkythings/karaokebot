-- Add lightweight operator presence and queue versioning for multi-admin shifts.
ALTER TABLE "Session" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "StaffPresence" (
    "staffUserId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPresence_pkey" PRIMARY KEY ("staffUserId")
);

CREATE INDEX "StaffPresence_lastSeenAt_idx" ON "StaffPresence"("lastSeenAt");

ALTER TABLE "StaffPresence" ADD CONSTRAINT "StaffPresence_staffUserId_fkey"
FOREIGN KEY ("staffUserId") REFERENCES "StaffUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
