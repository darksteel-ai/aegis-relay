import { describe, expect, test } from "vitest";

import {
  PRODUCTION_TIKTOK_REDIRECT_URI,
  TIKTOK_OAUTH_CALLBACK_PATH,
  buildTikTokOAuthStartUrl,
  normalizeTikTokRedirectUri,
  resolveTikTokRedirectUri,
} from "@/lib/platforms/tiktok-oauth";

const configuredEnv = {
  TIKTOK_CLIENT_KEY: "tiktok-client-key",
  TIKTOK_CLIENT_SECRET: "tiktok-client-secret",
  TIKTOK_REDIRECT_URI: "https://www.relaygator.com/api/auth/relay/callback",
};

describe("TikTok OAuth redirect URI", () => {
  test("normalizes whitespace and a trailing slash", () => {
    expect(
      normalizeTikTokRedirectUri(" https://www.relaygator.com/api/auth/relay/callback/ "),
    ).toBe(PRODUCTION_TIKTOK_REDIRECT_URI);
  });

  test("canonicalizes any Relaygator host and legacy /tiktok/callback path", () => {
    expect(
      resolveTikTokRedirectUri({
        TIKTOK_REDIRECT_URI: "https://relaygator.com/api/auth/tiktok/callback",
      }),
    ).toBe(PRODUCTION_TIKTOK_REDIRECT_URI);
    expect(
      resolveTikTokRedirectUri({
        NEXTAUTH_URL: "https://www.relaygator.com",
      }),
    ).toBe(PRODUCTION_TIKTOK_REDIRECT_URI);
  });

  test("keeps a non-production redirect URI after normalizing it", () => {
    expect(
      resolveTikTokRedirectUri({
        TIKTOK_REDIRECT_URI: "http://localhost:3000/api/auth/relay/callback/",
      }),
    ).toBe("http://localhost:3000/api/auth/relay/callback");
  });

  test("derives the callback from NEXTAUTH_URL when TIKTOK_REDIRECT_URI is missing", () => {
    expect(
      resolveTikTokRedirectUri({
        NEXTAUTH_URL: "http://localhost:3000",
      }),
    ).toBe(`http://localhost:3000${TIKTOK_OAUTH_CALLBACK_PATH}`);
  });

  test("builds an authorize URL with the canonical production redirect_uri", () => {
    const result = buildTikTokOAuthStartUrl(configuredEnv, { state: "signed-state" });

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    const url = new URL(result.url);
    expect(url.origin).toBe("https://www.tiktok.com");
    expect(url.pathname).toBe("/v2/auth/authorize/");
    expect(url.searchParams.get("client_key")).toBe("tiktok-client-key");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(PRODUCTION_TIKTOK_REDIRECT_URI);
    expect(url.searchParams.get("scope")).toBe(
      "user.info.basic,user.info.stats,video.publish,video.upload",
    );
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.search).not.toContain("tiktok-client-secret");
  });

  test("rewrites a stale Relaygator authorize redirect_uri to the portal value", () => {
    const result = buildTikTokOAuthStartUrl(
      {
        ...configuredEnv,
        TIKTOK_REDIRECT_URI: "https://www.relaygator.com/api/auth/tiktok/callback/",
      },
      { state: "signed-state" },
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(new URL(result.url).searchParams.get("redirect_uri")).toBe(
      PRODUCTION_TIKTOK_REDIRECT_URI,
    );
  });
});
