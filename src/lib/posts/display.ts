import { isValidTimeZone } from "@/lib/posts/create";

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  PROCESSING: "Processing",
  PUBLISHED: "Published",
  FAILED: "Failed",
  RETRYING: "Retrying",
  BLOCKED: "Blocked",
  APPROVAL_PENDING: "Approval pending",
};

const platformLabels: Record<string, string> = {
  YOUTUBE: "YouTube",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
};

export const CALENDAR_POST_LIMIT = 100;

const calendarPastWindowDays = 30;
const calendarFutureWindowDays = 180;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

type AccountWithPlatformUpdatedAt = {
  platform: string;
  updatedAt: Date;
};

export function formatScheduledAtForDashboard(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: isValidTimeZone(timezone) ? timezone : "UTC",
  }).format(date);
}

export function formatStatusLabel(status: string) {
  return statusLabels[status] ?? humanizeConstant(status);
}

export function formatPlatformLabel(platform: string) {
  return platformLabels[platform] ?? humanizeConstant(platform);
}

export function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return "Unknown size";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${formatSingleDecimal(size)} ${units[unitIndex]}`;
}

export function formatDuration(durationSec: number | null | undefined) {
  if (durationSec == null || !Number.isFinite(durationSec) || durationSec < 0) {
    return "Unknown duration";
  }

  const totalSeconds = Math.round(durationSec);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

export function selectNewestAccountsByPlatform<TAccount extends AccountWithPlatformUpdatedAt>(
  accounts: TAccount[],
) {
  const newestByPlatform = new Map<string, TAccount>();

  for (const account of accounts) {
    const existing = newestByPlatform.get(account.platform);

    if (!existing || account.updatedAt > existing.updatedAt) {
      newestByPlatform.set(account.platform, account);
    }
  }

  return newestByPlatform;
}

export function getCalendarPostWindow(now = new Date()) {
  return {
    start: new Date(now.getTime() - calendarPastWindowDays * millisecondsPerDay),
    end: new Date(now.getTime() + calendarFutureWindowDays * millisecondsPerDay),
    take: CALENDAR_POST_LIMIT,
  };
}

function humanizeConstant(value: string) {
  const words = value
    .toLowerCase()
    .split("_")
    .filter(Boolean);

  return words
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function formatSingleDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}
