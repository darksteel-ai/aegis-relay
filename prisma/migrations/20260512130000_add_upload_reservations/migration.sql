CREATE TYPE "UploadReservationStatus" AS ENUM ('ISSUED', 'CONSUMED');

CREATE TABLE "UploadReservation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "UploadReservationStatus" NOT NULL DEFAULT 'ISSUED',
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadReservation_storageKey_key" ON "UploadReservation"("storageKey");
CREATE INDEX "UploadReservation_workspaceId_userId_status_expiresAt_idx" ON "UploadReservation"("workspaceId", "userId", "status", "expiresAt");

ALTER TABLE "UploadReservation" ADD CONSTRAINT "UploadReservation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadReservation" ADD CONSTRAINT "UploadReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
