import { describe, expect, test } from "vitest";

import {
  buildPlatformPostCreateInputs,
  parseCreateScheduledPostInput,
} from "@/lib/posts/create";

const validPayload = {
  baseCaption: "Launch clip for the beta.",
  scheduledAt: "2026-06-01T14:30:00.000Z",
  timezone: "America/New_York",
  platforms: ["YOUTUBE", "TIKTOK"],
  video: {
    storageKey: "uploads/workspaces/workspace_123/users/user_123/clip.mp4",
    fileName: "clip.mp4",
    mimeType: "video/mp4",
    sizeBytes: 1024,
    width: 1080,
    height: 1920,
    durationSeconds: 30,
  },
};

describe("scheduled post creation rules", () => {
  test("normalizes a valid create post payload", () => {
    const result = parseCreateScheduledPostInput(validPayload, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toMatchObject({
      baseCaption: "Launch clip for the beta.",
      scheduledAt: new Date("2026-06-01T14:30:00.000Z"),
      timezone: "America/New_York",
      platforms: ["YOUTUBE", "TIKTOK"],
      video: {
        storageKey: "uploads/workspaces/workspace_123/users/user_123/clip.mp4",
        mimeType: "video/mp4",
        durationSeconds: 30,
      },
    });
  });

  test("accepts planned duration field for uploaded video payloads", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      video: {
        ...validPayload.video,
        durationSeconds: undefined,
        duration: 42.4,
      },
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.video.durationSeconds).toBe(42.4);
  });

  test("normalizes YouTube title and hashtags", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      youtubeTitle: "  Launch demo title  ",
      hashtags: "shorts, #ai launch",
      platforms: ["YOUTUBE", "INSTAGRAM"],
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.youtubeTitle).toBe("Launch demo title");
    expect(result.data.hashtags).toBe("#shorts #ai #launch");
    expect(buildPlatformPostCreateInputs(result.data)).toEqual([
      {
        platform: "YOUTUBE",
        title: "Launch demo title",
        caption: "Launch clip for the beta.\n\n#shorts #ai #launch",
        scheduledAt: new Date("2026-06-01T14:30:00.000Z"),
        status: "SCHEDULED",
      },
      {
        platform: "INSTAGRAM",
        caption: "Launch clip for the beta.\n\n#shorts #ai #launch",
        scheduledAt: new Date("2026-06-01T14:30:00.000Z"),
        status: "APPROVAL_PENDING",
      },
    ]);
  });

  test("keeps multiple selected accounts for the same platform", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      platforms: ["INSTAGRAM"],
      accountIdsByPlatform: {
        INSTAGRAM: ["account_1", "account_2", "account_1"],
      },
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.accountIdsByPlatform).toEqual({
      INSTAGRAM: ["account_1", "account_2"],
    });
  });

  test("rejects missing caption, timezone, platforms, and video", () => {
    const result = parseCreateScheduledPostInput({
      baseCaption: "",
      scheduledAt: "2026-06-01T14:30:00.000Z",
      timezone: "",
      platforms: [],
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Caption is required.",
        "Timezone is required.",
        "Select at least one platform.",
        "Video details are required.",
      ]),
    );
  });

  test("rejects unsupported platforms and invalid schedule datetimes", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      scheduledAt: "tomorrow",
      platforms: ["YOUTUBE", "MASTODON"],
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Schedule time must be a valid datetime.",
        "Unsupported platform selected.",
      ]),
    );
  });

  test("validates video metadata when it is available", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      video: {
        ...validPayload.video,
        width: 1920,
        height: 1080,
      },
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors).toContain("Video must be vertical.");
  });

  test("maps YouTube to scheduled and other platforms to approval pending", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      platforms: ["YOUTUBE", "TIKTOK", "INSTAGRAM"],
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(buildPlatformPostCreateInputs(result.data)).toEqual([
      {
        platform: "YOUTUBE",
        caption: "Launch clip for the beta.",
        scheduledAt: new Date("2026-06-01T14:30:00.000Z"),
        status: "SCHEDULED",
      },
      {
        platform: "TIKTOK",
        caption: "Launch clip for the beta.",
        scheduledAt: new Date("2026-06-01T14:30:00.000Z"),
        status: "APPROVAL_PENDING",
      },
      {
        platform: "INSTAGRAM",
        caption: "Launch clip for the beta.",
        scheduledAt: new Date("2026-06-01T14:30:00.000Z"),
        status: "APPROVAL_PENDING",
      },
    ]);
  });

  test("rejects storage keys outside the current workspace upload prefix", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      video: {
        ...validPayload.video,
        storageKey: "uploads/workspaces/other_workspace/clip.mp4",
      },
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors).toContain("Video upload does not belong to this workspace.");
  });

  test("rejects storage keys from another user in the same workspace", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      video: {
        ...validPayload.video,
        storageKey: "uploads/workspaces/workspace_123/users/other_user/clip.mp4",
      },
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors).toContain("Video upload does not belong to this user.");
  });

  test("requires dimensions and duration for scheduled videos", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      video: {
        ...validPayload.video,
        width: undefined,
        height: undefined,
        durationSeconds: undefined,
      },
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Video width and height are required.",
        "Video duration is required.",
      ]),
    );
  });

  test("rejects scheduled posts in the past and invalid timezones", () => {
    const result = parseCreateScheduledPostInput({
      ...validPayload,
      scheduledAt: "2026-05-12T11:59:59.000Z",
      timezone: "Mars/Olympus_Mons",
    }, {
      workspaceId: "workspace_123",
      userId: "user_123",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Schedule time must be in the future.",
        "Timezone must be a valid IANA timezone.",
      ]),
    );
  });
});
