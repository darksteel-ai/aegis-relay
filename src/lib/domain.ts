export const Platform = {
  YOUTUBE: "YOUTUBE",
  TIKTOK: "TIKTOK",
  INSTAGRAM: "INSTAGRAM",
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

export const platforms = [Platform.YOUTUBE, Platform.TIKTOK, Platform.INSTAGRAM] as const;

export const PublishStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PROCESSING: "PROCESSING",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
  RETRYING: "RETRYING",
  BLOCKED: "BLOCKED",
  APPROVAL_PENDING: "APPROVAL_PENDING",
} as const;

export type PublishStatus = (typeof PublishStatus)[keyof typeof PublishStatus];

export const UploadReservationStatus = {
  ISSUED: "ISSUED",
  CONSUMED: "CONSUMED",
} as const;

export type UploadReservationStatus =
  (typeof UploadReservationStatus)[keyof typeof UploadReservationStatus];
