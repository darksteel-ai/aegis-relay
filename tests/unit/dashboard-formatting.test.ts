import { describe, expect, test } from "vitest";

import { formatScheduledAtForDashboard } from "@/lib/posts/display";

describe("dashboard post formatting", () => {
  test("falls back to UTC when a stored timezone is invalid", () => {
    const formatted = formatScheduledAtForDashboard(
      new Date("2026-06-01T14:30:00.000Z"),
      "Mars/Olympus_Mons",
    );

    expect(formatted).toBe("Jun 1, 2026, 2:30 PM");
  });
});
