import { describe, expect, test, vi } from "vitest";

import {
  buildInstagramOAuthStartUrl,
  completeInstagramOAuthCallback,
  createInstagramOAuthState,
  verifyInstagramOAuthState,
} from "@/lib/platforms/instagram-oauth";

describe("Instagram OAuth scaffold", () => {
  test("builds an Instagram authorization URL when configuration is present", () => {
    const result = buildInstagramOAuthStartUrl(
      {
        META_APP_ID: "meta-app-id",
        META_APP_SECRET: "meta-secret",
        INSTAGRAM_APP_ID: "instagram-app-id",
        INSTAGRAM_APP_SECRET: "instagram-secret",
        INSTAGRAM_REDIRECT_URI: "https://app.example.com/api/auth/instagram/callback",
      },
      { state: "signed-state" },
    );

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    const url = new URL(result.url);
    expect(url.origin).toBe("https://www.instagram.com");
    expect(url.pathname).toBe("/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("instagram-app-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/auth/instagram/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toBe(
      "instagram_business_basic,instagram_business_content_publish",
    );
    expect(url.searchParams.get("enable_fb_login")).toBe("0");
    expect(url.searchParams.get("force_authentication")).toBe("1");
    expect(url.search).not.toContain("meta-secret");
    expect(url.search).not.toContain("instagram-secret");
  });

  test("does not mix an Instagram app ID with a Meta app secret", () => {
    const result = buildInstagramOAuthStartUrl(
      {
        META_APP_ID: "meta-app-id",
        META_APP_SECRET: "meta-secret",
        INSTAGRAM_APP_ID: "instagram-app-id",
        INSTAGRAM_REDIRECT_URI: "https://app.example.com/api/auth/instagram/callback",
      },
      { state: "signed-state" },
    );

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    const url = new URL(result.url);
    expect(url.searchParams.get("client_id")).toBe("meta-app-id");
  });

  test("creates and verifies signed OAuth state tied to user and workspace", () => {
    const state = createInstagramOAuthState({
      userId: "user_1",
      workspaceId: "workspace_1",
      nonce: "nonce_1",
      secret: "this-is-a-long-nextauth-secret",
      redirectUri: "https://app.example.com/api/auth/instagram/callback",
      now: new Date("2026-05-12T12:00:00.000Z"),
    });

    expect(
      verifyInstagramOAuthState({
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
      redirectUri: "https://app.example.com/api/auth/instagram/callback",
    });
  });

  test("exchanges code, finds a linked Instagram account, and upserts it", async () => {
    const upsert = vi.fn(async () => "connected_1");

    const result = await completeInstagramOAuthCallback({
      code: "oauth-code",
      workspaceId: "workspace_1",
      env: {
        META_APP_ID: "meta-app-id",
        META_APP_SECRET: "meta-secret",
        INSTAGRAM_REDIRECT_URI: "https://app.example.com/api/auth/instagram/callback",
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      },
      db: {
        connectedAccount: { upsert },
      },
      exchangeCodeForToken: vi.fn(async () => ({
        access_token: "user-access-token",
        expires_in: 3600,
      })),
      fetchInstagramAccounts: vi.fn(async () => [
        {
          instagramAccountId: "ig_123",
          accountName: "Demo Instagram",
        },
      ]),
    });

    expect(result).toEqual({ success: true, accountId: "connected_1" });
    expect(upsert).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      platform: "INSTAGRAM",
      accountName: "Demo Instagram",
      externalId: "ig_123",
      accessToken: expect.stringMatching(/^enc:v1:/),
      refreshToken: undefined,
      expiresAt: expect.any(Number),
      scopes: "instagram_business_basic,instagram_business_content_publish",
      status: "SCHEDULED",
    });
  });

  test("reports Instagram token endpoint error messages", async () => {
    const result = await completeInstagramOAuthCallback({
      code: "oauth-code",
      workspaceId: "workspace_1",
      env: {
        META_APP_ID: "meta-app-id",
        META_APP_SECRET: "meta-secret",
        INSTAGRAM_REDIRECT_URI: "https://app.example.com/api/auth/instagram/callback",
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      },
      db: {
        connectedAccount: { upsert: vi.fn() },
      },
      exchangeCodeForToken: vi.fn(async () => ({
        error_message: "Invalid verification code format.",
        error_type: "OAuthException",
        code: 100,
      })),
      fetchInstagramAccounts: vi.fn(),
    });

    expect(result).toEqual({
      success: false,
      reason: "missing-token",
      message: "Invalid verification code format.",
    });
  });

  test("passes the signed redirect URI into the token exchange", async () => {
    const exchangeCodeForToken = vi.fn(async () => ({
      access_token: "user-access-token",
      expires_in: 3600,
    }));

    await completeInstagramOAuthCallback({
      code: "oauth-code",
      workspaceId: "workspace_1",
      redirectUri: "https://www.aegisrelay.app/api/auth/instagram/callback",
      env: {
        META_APP_ID: "meta-app-id",
        META_APP_SECRET: "meta-secret",
        INSTAGRAM_REDIRECT_URI: "https://app.example.com/api/auth/instagram/callback",
        PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
      },
      db: {
        connectedAccount: { upsert: vi.fn(async () => "connected_1") },
      },
      exchangeCodeForToken,
      fetchInstagramAccounts: vi.fn(async () => [
        {
          instagramAccountId: "ig_123",
          accountName: "Demo Instagram",
        },
      ]),
    });

    expect(exchangeCodeForToken).toHaveBeenCalledWith(
      "oauth-code",
      expect.any(Object),
      "https://www.aegisrelay.app/api/auth/instagram/callback",
      expect.objectContaining({
        error: expect.any(Function),
        info: expect.any(Function),
      }),
    );
  });
});
