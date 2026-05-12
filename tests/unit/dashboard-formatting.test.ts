import { describe, expect, test } from "vitest";

import {
  formatDuration,
  formatFileSize,
  formatPlatformLabel,
  formatScheduledAtForDashboard,
  formatStatusLabel,
} from "@/lib/posts/display";

describe("dashboard post formatting", () => {
  test("falls back to UTC when a stored timezone is invalid", () => {
    const formatted = formatScheduledAtForDashboard(
      new Date("2026-06-01T14:30:00.000Z"),
      "Mars/Olympus_Mons",
    );

    expect(formatted).toBe("Jun 1, 2026, 2:30 PM");
  });

  test("labels known scheduler statuses consistently", () => {
    expect(formatStatusLabel("SCHEDULED")).toBe("Scheduled");
    expect(formatStatusLabel("APPROVAL_PENDING")).toBe("Approval pending");
    expect(formatStatusLabel("FAILED")).toBe("Failed");
  });

  test("humanizes unknown scheduler statuses without losing meaning", () => {
    expect(formatStatusLabel("NEEDS_REVIEW")).toBe("Needs review");
  });

  test("labels supported platforms for display", () => {
    expect(formatPlatformLabel("YOUTUBE")).toBe("YouTube");
    expect(formatPlatformLabel("TIKTOK")).toBe("TikTok");
    expect(formatPlatformLabel("INSTAGRAM")).toBe("Instagram");
  });

  test("formats file sizes and durations for post details", () => {
    expect(formatFileSize(1_572_864)).toBe("1.5 MB");
    expect(formatFileSize(999)).toBe("999 B");
    expect(formatDuration(125)).toBe("2m 5s");
    expect(formatDuration(null)).toBe("Unknown duration");
  });
});
