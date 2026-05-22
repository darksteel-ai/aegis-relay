import { PassThrough } from "node:stream";

import { describe, expect, test, vi } from "vitest";

import { createInstagramAdapter } from "@/lib/platforms/instagram";
import { createTikTokAdapter } from "@/lib/platforms/tiktok";
import { createYouTubeAdapter } from "@/lib/platforms/youtube";

const publishInput = {
  connectedAccount: {
    externalId: "17841473706865624",
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
    sizeBytes: 11,
  },
};

const googleEnv = {
  GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "client-secret",
  GOOGLE_REDIRECT_URI: "https://app.example.com/api/oauth/youtube/callback",
  PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
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
      env: googleEnv,
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

  test("YouTube adapter configures OAuth client with Google app credentials", async () => {
    const createOAuthClient = vi.fn(() => ({ setCredentials: vi.fn() }));
    const adapter = createYouTubeAdapter({
      env: {
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_REDIRECT_URI: "https://app.example.com/api/oauth/youtube/callback",
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      },
      createOAuthClient,
      getVideoReadStream: vi.fn(async () => new PassThrough()),
      createYouTubeClient: vi.fn(() => ({
        videos: { insert: vi.fn(async () => ({ data: { id: "youtube-video-123" } })) },
      })),
    });

    await adapter.publish(publishInput);

    expect(createOAuthClient).toHaveBeenCalledWith({
      clientId: "client-id.apps.googleusercontent.com",
      clientSecret: "client-secret",
      redirectUri: "https://app.example.com/api/oauth/youtube/callback",
    });
  });

  test("YouTube adapter persists refreshed tokens emitted by Google auth", async () => {
    const onTokens = vi.fn();
    const oauthClient = {
      setCredentials: vi.fn(),
      on: vi.fn(),
    };
    const adapter = createYouTubeAdapter({
      env: googleEnv,
      createOAuthClient: vi.fn(() => oauthClient),
      getVideoReadStream: vi.fn(async () => new PassThrough()),
      persistRefreshedTokens: onTokens,
      createYouTubeClient: vi.fn(() => ({
        videos: {
          insert: vi.fn(async () => {
            const tokenHandler = oauthClient.on.mock.calls.find(([event]) => event === "tokens")?.[1];
            tokenHandler?.({
              access_token: "fresh-access-token",
              refresh_token: "fresh-refresh-token",
              expiry_date: Date.parse("2026-06-02T00:00:00.000Z"),
              scope: "https://www.googleapis.com/auth/youtube.upload",
            });

            return { data: { id: "youtube-video-123" } };
          }),
        },
      })),
    });

    await adapter.publish({
      ...publishInput,
      connectedAccount: {
        ...publishInput.connectedAccount,
        id: "connected_1",
      },
    });

    expect(oauthClient.on).toHaveBeenCalledWith("tokens", expect.any(Function));
    expect(onTokens).toHaveBeenCalledWith({
      connectedAccountId: "connected_1",
      accessToken: "fresh-access-token",
      refreshToken: "fresh-refresh-token",
      expiresAt: new Date("2026-06-02T00:00:00.000Z"),
      scopes: "https://www.googleapis.com/auth/youtube.upload",
    });
  });

  test("YouTube adapter falls back to caption for title and public privacy", async () => {
    const videosInsert = vi.fn(async () => ({
      data: { id: "youtube-video-456" },
    }));
    const adapter = createYouTubeAdapter({
      env: googleEnv,
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
      env: googleEnv,
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

  test("TikTok adapter initializes direct post and uploads the video", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({
          data: {
            privacy_level_options: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
            comment_disabled: false,
            duet_disabled: false,
            stitch_disabled: true,
          },
          error: { code: "ok", message: "" },
        })),
      })
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({
          data: {
            publish_id: "v_pub_file~demo",
            upload_url: "https://open-upload.tiktokapis.com/video/upload",
          },
          error: { code: "ok", message: "" },
        })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
    const stream = new PassThrough();
    stream.end("hello world");
    const adapter = createTikTokAdapter({
      fetchFn,
      getVideoReadStream: vi.fn(async () => stream),
    });

    const result = await adapter.publish(publishInput);

    expect(result).toEqual({ platformPostId: "v_pub_file~demo" });
    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
      }),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"privacy_level":"SELF_ONLY"'),
      }),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      "https://open-upload.tiktokapis.com/video/upload",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Length": "11",
          "Content-Range": "bytes 0-10/11",
          "Content-Type": "video/mp4",
        }),
      }),
    );
  });

  test("TikTok adapter surfaces missing publish scope errors", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce({
      json: vi.fn(async () => ({
        error: {
          code: "scope_not_authorized",
          message: "The access_token does not bear user's grant on video.publish scope.",
        },
      })),
    });
    const adapter = createTikTokAdapter({ fetchFn });

    await expect(adapter.publish(publishInput)).rejects.toThrow("video.publish scope");
  });

  test("TikTok adapter defaults public requests to private while direct post audit is pending", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({
          data: {
            privacy_level_options: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
          },
          error: { code: "ok", message: "" },
        })),
      })
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({
          data: {
            publish_id: "v_pub_file~private",
            upload_url: "https://open-upload.tiktokapis.com/video/upload",
          },
          error: { code: "ok", message: "" },
        })),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
    const stream = new PassThrough();
    stream.end("hello world");
    const adapter = createTikTokAdapter({
      fetchFn,
      getVideoReadStream: vi.fn(async () => stream),
    });

    await adapter.publish({
      ...publishInput,
      platformPost: {
        ...publishInput.platformPost,
        privacy: "public",
      },
    });

    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"privacy_level":"SELF_ONLY"'),
      }),
    );
  });

  test("Instagram adapter creates, waits for, and publishes a Reel media container", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({ id: "ig-container-123" })),
      })
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({ id: "ig-container-123", status_code: "FINISHED" })),
      })
      .mockResolvedValueOnce({
        json: vi.fn(async () => ({ id: "ig-media-456" })),
      });
    const adapter = createInstagramAdapter({
      fetchFn,
      createVideoUrl: vi.fn(async () => "https://cdn.example.com/video.mp4?signature=demo"),
      waitMs: vi.fn(async () => undefined),
    });

    const result = await adapter.publish(publishInput);

    expect(result).toEqual({
      platformPostId: "ig-media-456",
      url: "https://www.instagram.com/reel/ig-media-456/",
    });
    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      "https://graph.instagram.com/v24.0/17841473706865624/media",
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      }),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("https://graph.instagram.com/v24.0/ig-container-123"),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      "https://graph.instagram.com/v24.0/17841473706865624/media_publish",
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      }),
    );
  });

  test("Instagram adapter requires the connected Instagram user id", async () => {
    const adapter = createInstagramAdapter();

    await expect(
      adapter.publish({
        ...publishInput,
        connectedAccount: {
          ...publishInput.connectedAccount,
          externalId: null,
        },
      }),
    ).rejects.toThrow("Instagram account id is missing");
  });
});
