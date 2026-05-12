import { PassThrough } from "node:stream";

import { Platform } from "@prisma/client";
import { describe, expect, test, vi } from "vitest";

import { createInstagramAdapter } from "@/lib/platforms/instagram";
import { createTikTokAdapter } from "@/lib/platforms/tiktok";
import { createYouTubeAdapter } from "@/lib/platforms/youtube";

const publishInput = {
  connectedAccount: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresAt: new Date("2026-06-01T00:00:00.000Z"),
  },
  platformPost: {
    title: "Launch demo",
    caption: "A concise launch caption.",
    privacy: "private",
  },
  video: {
    storageKey: "uploads/workspaces/workspace_1/users/user_1/demo.mp4",
    mimeType: "video/mp4",
  },
};

describe("platform adapters", () => {
  test("YouTube adapter uploads a video with snippet, status, and media stream", async () => {
    const stream = new PassThrough();
    const videosInsert = vi.fn(async () => ({
      data: { id: "youtube-video-123" },
    }));
    const setCredentials = vi.fn();
    const oauthClient = { setCredentials };
    const adapter = createYouTubeAdapter({
      createOAuthClient: vi.fn(() => oauthClient),
      getVideoReadStream: vi.fn(async () => stream),
      createYouTubeClient: vi.fn(() => ({
        videos: { insert: videosInsert },
      })),
    });

    const result = await adapter.publish(publishInput);

    expect(setCredentials).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expiry_date: new Date("2026-06-01T00:00:00.000Z").getTime(),
    });
    expect(videosInsert).toHaveBeenCalledWith({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: "Launch demo",
          description: "A concise launch caption.",
        },
        status: {
          privacyStatus: "private",
        },
      },
      media: {
        mimeType: "video/mp4",
        body: stream,
      },
    });
    expect(result).toEqual({
      platformPostId: "youtube-video-123",
      url: "https://www.youtube.com/watch?v=youtube-video-123",
    });
  });

  test("YouTube adapter falls back to caption for title and public privacy", async () => {
    const videosInsert = vi.fn(async () => ({
      data: { id: "youtube-video-456" },
    }));
    const adapter = createYouTubeAdapter({
      createOAuthClient: vi.fn(() => ({ setCredentials: vi.fn() })),
      getVideoReadStream: vi.fn(async () => new PassThrough()),
      createYouTubeClient: vi.fn(() => ({
        videos: { insert: videosInsert },
      })),
    });

    await adapter.publish({
      ...publishInput,
      platformPost: {
        title: null,
        caption: "Caption-only upload title should be trimmed to YouTube length.",
        privacy: "",
      },
    });

    expect(videosInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          snippet: {
            title: "Caption-only upload title should be trimmed to YouTube length.",
            description: "Caption-only upload title should be trimmed to YouTube length.",
          },
          status: { privacyStatus: "public" },
        }),
      }),
    );
  });

  test("YouTube adapter rejects missing video ids from Google", async () => {
    const adapter = createYouTubeAdapter({
      createOAuthClient: vi.fn(() => ({ setCredentials: vi.fn() })),
      getVideoReadStream: vi.fn(async () => new PassThrough()),
      createYouTubeClient: vi.fn(() => ({
        videos: { insert: vi.fn(async () => ({ data: {} })) },
      })),
    });

    await expect(adapter.publish(publishInput)).rejects.toThrow(
      "YouTube upload did not return a video id.",
    );
  });

  test("TikTok and Instagram adapters remain approval-pending placeholders", async () => {
    await expect(createTikTokAdapter().publish(publishInput)).rejects.toMatchObject({
      platform: Platform.TIKTOK,
      code: "APPROVAL_PENDING",
      message: "TikTok publishing is pending platform approval.",
    });
    await expect(createInstagramAdapter().publish(publishInput)).rejects.toMatchObject({
      platform: Platform.INSTAGRAM,
      code: "APPROVAL_PENDING",
      message: "Instagram publishing is pending platform approval.",
    });
  });
});
