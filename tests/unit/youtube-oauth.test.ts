import { describe, expect, test, vi } from "vitest";

import {
  buildYouTubeOAuthStartUrl,
  completeYouTubeOAuthCallback,
  createYouTubeOAuthState,
  decryptConnectedAccountToken,
  encryptConnectedAccountToken,
  verifyYouTubeOAuthState,
} from "@/lib/platforms/youtube-oauth";

describe("YouTube OAuth scaffold", () => {
  test("builds a Google authorization URL when configuration is present", () => {
    const result = buildYouTubeOAuthStartUrl(
      {
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_REDIRECT_URI: "https://app.example.com/api/oauth/youtube/callback",
      },
      { state: "signed-state" },
    );

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    const url = new URL(result.url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.pathname).toBe("/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-id.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/oauth/youtube/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toBe(
      "https://www.googleapis.com/auth/youtube.upload",
    );
    expect(url.search).not.toContain("client-secret");
  });

  test("returns a configuration error when Google OAuth settings are missing", () => {
    const result = buildYouTubeOAuthStartUrl({});

    expect(result).toEqual({
      success: false,
      reason: "config-error",
    });
  });

  test("creates and verifies signed OAuth state tied to user and workspace", () => {
    const state = createYouTubeOAuthState({
      userId: "user_1",
      workspaceId: "workspace_1",
      nonce: "nonce_1",
      secret: "this-is-a-long-nextauth-secret",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(
      verifyYouTubeOAuthState({
        state,
        nonce: "nonce_1",
        userId: "user_1",
        workspaceId: "workspace_1",
        secret: "this-is-a-long-nextauth-secret",
        now: new Date("2026-05-12T12:05:00.000Z"),
      }),
    ).toEqual({
      success: true,
      userId: "user_1",
      workspaceId: "workspace_1",
    });
  });

  test("rejects OAuth state replayed for a different nonce", () => {
    const state = createYouTubeOAuthState({
      userId: "user_1",
      workspaceId: "workspace_1",
      nonce: "nonce_1",
      secret: "this-is-a-long-nextauth-secret",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(
      verifyYouTubeOAuthState({
        state,
        nonce: "nonce_2",
        userId: "user_1",
        workspaceId: "workspace_1",
        secret: "this-is-a-long-nextauth-secret",
        now: new Date("2026-05-12T12:05:00.000Z"),
      }),
    ).toEqual({
      success: false,
      reason: "invalid-state",
    });
  });

  test("exchanges code, fetches the user channel, and upserts a connected account", async () => {
    const upsert = vi.fn(async () => ({ id: "connected_1" }));

    const result = await completeYouTubeOAuthCallback({
      code: "oauth-code",
      workspaceId: "workspace_1",
      env: {
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_REDIRECT_URI: "https://app.example.com/api/oauth/youtube/callback",
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      },
      db: {
        connectedAccount: { upsert },
      },
      exchangeCodeForTokens: vi.fn(async () => ({
        tokens: {
          access_token: "access-token",
          refresh_token: "refresh-token",
          expiry_date: Date.parse("2026-06-01T00:00:00.000Z"),
          scope: "https://www.googleapis.com/auth/youtube.upload",
        },
      })),
      fetchMineChannel: vi.fn(async () => ({
        id: "channel_123",
        title: "Demo Channel",
      })),
    });

    expect(result).toEqual({ success: true, accountId: "connected_1" });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        workspaceId_platform_externalId: {
          workspaceId: "workspace_1",
          platform: "YOUTUBE",
          externalId: "channel_123",
        },
      },
      create: {
        workspaceId: "workspace_1",
        platform: "YOUTUBE",
        accountName: "Demo Channel",
        externalId: "channel_123",
        accessToken: expect.stringMatching(/^enc:v1:/),
        refreshToken: expect.stringMatching(/^enc:v1:/),
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        scopes: "https://www.googleapis.com/auth/youtube.upload",
        status: "SCHEDULED",
      },
      update: {
        accountName: "Demo Channel",
        accessToken: expect.stringMatching(/^enc:v1:/),
        refreshToken: expect.stringMatching(/^enc:v1:/),
        expiresAt: new Date("2026-06-01T00:00:00.000Z"),
        scopes: "https://www.googleapis.com/auth/youtube.upload",
        status: "SCHEDULED",
      },
      select: { id: true },
    });
  });

  test("preserves an existing refresh token when Google does not return a new one", async () => {
    const upsert = vi.fn(async () => ({ id: "connected_1" }));

    const result = await completeYouTubeOAuthCallback({
      code: "oauth-code",
      workspaceId: "workspace_1",
      env: {
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_REDIRECT_URI: "https://app.example.com/api/oauth/youtube/callback",
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      },
      db: {
        connectedAccount: { upsert },
      },
      exchangeCodeForTokens: vi.fn(async () => ({
        tokens: {
          access_token: "access-token",
          expiry_date: Date.parse("2026-06-01T00:00:00.000Z"),
          scope: "https://www.googleapis.com/auth/youtube.upload",
        },
      })),
      fetchMineChannel: vi.fn(async () => ({
        id: "channel_123",
        title: "Demo Channel",
      })),
    });

    expect(result).toEqual({ success: true, accountId: "connected_1" });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.not.objectContaining({
          refreshToken: expect.anything(),
        }),
      }),
    );
  });

  test("encrypts and decrypts connected account tokens", () => {
    const encrypted = encryptConnectedAccountToken("access-token", {
      PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
    });

    expect(encrypted).toMatch(/^enc:v1:/);
    expect(encrypted).not.toContain("access-token");
    expect(
      decryptConnectedAccountToken(encrypted, {
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      }),
    ).toBe("access-token");
  });

  test("returns a clear error when Google does not return an access token", async () => {
    const result = await completeYouTubeOAuthCallback({
      code: "oauth-code",
      workspaceId: "workspace_1",
      env: {
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_REDIRECT_URI: "https://app.example.com/api/oauth/youtube/callback",
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      },
      db: {
        connectedAccount: { upsert: vi.fn() },
      },
      exchangeCodeForTokens: vi.fn(async () => ({
        tokens: {
          refresh_token: "refresh-token",
        },
      })),
      fetchMineChannel: vi.fn(),
    });

    expect(result).toEqual({
      success: false,
      reason: "missing-token",
      message: "Google did not return a YouTube access token.",
    });
  });

  test("returns a clear error when no YouTube channel is available", async () => {
    const result = await completeYouTubeOAuthCallback({
      code: "oauth-code",
      workspaceId: "workspace_1",
      env: {
        GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_REDIRECT_URI: "https://app.example.com/api/oauth/youtube/callback",
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      },
      db: {
        connectedAccount: { upsert: vi.fn() },
      },
      exchangeCodeForTokens: vi.fn(async () => ({
        tokens: {
          access_token: "access-token",
        },
      })),
      fetchMineChannel: vi.fn(async () => null),
    });

    expect(result).toEqual({
      success: false,
      reason: "missing-channel",
      message: "Google did not return a YouTube channel for this user.",
    });
  });
});
