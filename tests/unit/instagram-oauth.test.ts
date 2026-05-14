import { describe, expect, test, vi } from "vitest";

import {
  buildInstagramOAuthStartUrl,
  completeInstagramOAuthCallback,
  createInstagramOAuthState,
  verifyInstagramOAuthState,
} from "@/lib/platforms/instagram-oauth";

describe("Instagram OAuth scaffold", () => {
  test("builds a Meta authorization URL when configuration is present", () => {
    const result = buildInstagramOAuthStartUrl(
      {
        META_APP_ID: "meta-app-id",
        META_APP_SECRET: "meta-secret",
        INSTAGRAM_REDIRECT_URI: "https://app.example.com/api/auth/instagram/callback",
      },
      { state: "signed-state" },
    );

    expect(result.success).toBe(true);

    if (!result.success) {
      return;
    }

    const url = new URL(result.url);
    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.pathname).toBe("/v24.0/dialog/oauth");
    expect(url.searchParams.get("client_id")).toBe("meta-app-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/auth/instagram/callback",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("scope")).toBe(
      "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
    );
    expect(url.search).not.toContain("meta-secret");
  });

  test("creates and verifies signed OAuth state tied to user and workspace", () => {
    const state = createInstagramOAuthState({
      userId: "user_1",
      workspaceId: "workspace_1",
      nonce: "nonce_1",
      secret: "this-is-a-long-nextauth-secret",
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
          pageAccessToken: "page-access-token",
          instagramAccountId: "ig_123",
          accountName: "Demo Instagram",
          pageName: "Demo Page",
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
      expiresAt: null,
      scopes: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
      status: "SCHEDULED",
    });
  });
});
