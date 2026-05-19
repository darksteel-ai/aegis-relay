import { describe, expect, test } from "vitest";

import { getConnectionHealth } from "@/lib/connections/health";

describe("connection health", () => {
  test("marks missing accounts as not connected", () => {
    expect(getConnectionHealth(null)).toMatchObject({
      status: "not-connected",
      label: "Not connected",
    });
  });

  test("marks missing permissions before token freshness", () => {
    expect(getConnectionHealth({
      platform: "TIKTOK",
      accountName: "Brand TikTok",
      scopes: "user.info.basic,video.upload",
      expiresAt: Date.parse("2026-06-10T00:00:00.000Z"),
    }, new Date("2026-05-17T00:00:00.000Z"))).toMatchObject({
      status: "missing-permissions",
      label: "Missing permissions",
    });
  });

  test("marks expired tokens", () => {
    expect(getConnectionHealth({
      platform: "INSTAGRAM",
      accountName: "Brand IG",
      scopes: "instagram_basic,instagram_content_publish",
      expiresAt: Date.parse("2026-05-10T00:00:00.000Z"),
    }, new Date("2026-05-17T00:00:00.000Z"))).toMatchObject({
      status: "expired",
      label: "Expired",
    });
  });

  test("keeps refreshable accounts connected even when access token expires", () => {
    expect(getConnectionHealth({
      platform: "YOUTUBE",
      accountName: "Brand Channel",
      scopes: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      expiresAt: Date.parse("2026-05-10T00:00:00.000Z"),
      hasRefreshToken: true,
    }, new Date("2026-05-17T00:00:00.000Z"))).toMatchObject({
      status: "connected",
      label: "Connected",
      message: "Brand Channel is connected. Access refreshes automatically.",
    });
  });

  test("marks healthy accounts as connected", () => {
    expect(getConnectionHealth({
      platform: "YOUTUBE",
      accountName: "Brand Channel",
      scopes: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
      expiresAt: null,
    })).toMatchObject({
      status: "connected",
      label: "Connected",
    });
  });
});
