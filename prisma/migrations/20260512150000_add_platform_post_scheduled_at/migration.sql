ALTER TABLE "PlatformPost" ADD COLUMN "scheduledAt" TIMESTAMP(3);

UPDATE "PlatformPost"
SET "scheduledAt" = "ScheduledPost"."scheduledAt"
FROM "ScheduledPost"
WHERE "PlatformPost"."scheduledPostId" = "ScheduledPost"."id";

ALTER TABLE "PlatformPost" ALTER COLUMN "scheduledAt" SET NOT NULL;

CREATE INDEX "PlatformPost_status_scheduledAt_updatedAt_idx" ON "PlatformPost"("status", "scheduledAt", "updatedAt");
