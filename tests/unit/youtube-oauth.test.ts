import { describe, expect, test } from "vitest";

import { buildYouTubeOAuthStartUrl } from "@/lib/platforms/youtube-oauth";

describe("YouTube OAuth scaffold", () => {
  test("builds a Google authorization URL when configuration is present", () => {
    const result = buildYouTubeOAuthStartUrl({
      GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "client-secret",
      GOOGLE_REDIRECT_URI: "https://app.example.com/api/oauth/youtube/callback",
    });

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
    expect(url.searchParams.get("scope")).toBe(
      "https://www.googleapis.com/auth/youtube.upload",
    );
  });

  test("returns a configuration error when Google OAuth settings are missing", () => {
    const result = buildYouTubeOAuthStartUrl({});

    expect(result).toEqual({
      success: false,
      reason: "config-error",
    });
  });
});
