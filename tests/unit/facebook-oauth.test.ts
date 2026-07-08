import { afterEach, describe, expect, test, vi } from "vitest";

import { completeFacebookOAuthCallback } from "@/lib/platforms/facebook-oauth";
import { decryptConnectedAccountToken } from "@/lib/platforms/token-crypto";

const facebookEnv = {
  FACEBOOK_APP_ID: "facebook-app-id",
  FACEBOOK_APP_SECRET: "facebook-app-secret",
  FACEBOOK_REDIRECT_URI: "https://app.example.com/api/auth/facebook/callback",
  PLATFORM_TOKEN_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
};

type StoredAccount = {
  accessToken: string;
  expiresAt: number | null;
  externalId: string;
};

function jsonResponse(body: unknown) {
  return {
    status: 200,
    json: async () => body,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("facebook oauth callback", () => {
  test("exchanges the code for a long-lived token and stores non-expiring page tokens", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "short-user-token", expires_in: 5000 }))
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "long-user-token", expires_in: 5183944 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "page-1",
              name: "Demo Page",
              access_token: "page-token",
              tasks: ["MANAGE"],
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const upsert = vi.fn(async (_account: StoredAccount) => "account_fb_1");

    const result = await completeFacebookOAuthCallback({
      code: "auth-code",
      workspaceId: "workspace_1",
      env: facebookEnv,
      db: { connectedAccount: { upsert } },
      logger: { error: vi.fn(), info: vi.fn() },
    });

    expect(result).toEqual({ success: true, accountIds: ["account_fb_1"] });

    const exchangeUrl = new URL(String(fetchMock.mock.calls[1]?.[0]));
    expect(exchangeUrl.pathname).toContain("/oauth/access_token");
    expect(exchangeUrl.searchParams.get("grant_type")).toBe("fb_exchange_token");
    expect(exchangeUrl.searchParams.get("fb_exchange_token")).toBe("short-user-token");

    const pagesUrl = new URL(String(fetchMock.mock.calls[2]?.[0]));
    expect(pagesUrl.searchParams.get("access_token")).toBe("long-user-token");

    const stored = upsert.mock.calls[0]?.[0];
    expect(stored?.externalId).toBe("page-1");
    expect(stored?.expiresAt).toBeNull();
    expect(decryptConnectedAccountToken(stored?.accessToken ?? "", facebookEnv)).toBe(
      "page-token",
    );
  });

  test("falls back to the short-lived token when the long-lived exchange fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "short-user-token", expires_in: 5000 }))
      .mockResolvedValueOnce(jsonResponse({ error: { message: "exchange rejected" } }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "page-1",
              name: "Demo Page",
              access_token: "page-token",
              tasks: ["MANAGE"],
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const upsert = vi.fn(async (_account: StoredAccount) => "account_fb_1");

    const result = await completeFacebookOAuthCallback({
      code: "auth-code",
      workspaceId: "workspace_1",
      env: facebookEnv,
      db: { connectedAccount: { upsert } },
      logger: { error: vi.fn(), info: vi.fn() },
    });

    expect(result).toEqual({ success: true, accountIds: ["account_fb_1"] });

    const pagesUrl = new URL(String(fetchMock.mock.calls[2]?.[0]));
    expect(pagesUrl.searchParams.get("access_token")).toBe("short-user-token");

    const stored = upsert.mock.calls[0]?.[0];
    expect(stored?.expiresAt).toBeGreaterThan(Date.now());
  });
});
