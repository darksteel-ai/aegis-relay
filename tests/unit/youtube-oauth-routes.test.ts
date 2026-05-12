import { beforeEach, describe, expect, test, vi } from "vitest";

const getAuthSession = vi.fn();
const query = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession,
}));

vi.mock("@/lib/convex-server", () => ({
  getConvexClient: () => ({ query }),
}));

describe("YouTube OAuth routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "https://app.example.com/api/oauth/youtube/callback");
    vi.stubEnv("PLATFORM_TOKEN_ENCRYPTION_KEY", "0123456789abcdef0123456789abcdef");
    getAuthSession.mockResolvedValue({
      user: { id: "user_1", email: "owner@example.com" },
    });
    query.mockResolvedValue({ id: "workspace_1", name: "Owner's Workspace" });
  });

  test("start redirects to Google with signed state and stores a state cookie", async () => {
    const { GET } = await import("../../src/app/api/oauth/youtube/start/route");

    const response = await (GET as (request: Request) => Promise<Response>)(
      new Request("https://app.example.com/api/oauth/youtube/start"),
    );
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).toBeTruthy();
    const url = new URL(location ?? "");
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/youtube.upload");
    expect(url.searchParams.get("state")).toBeTruthy();
    expect(response.headers.get("set-cookie")).toContain("youtube_oauth_state=");
    expect(location).not.toContain("client-secret");
  });

  test("callback redirects with a clear status when the code is missing", async () => {
    const { GET } = await import("../../src/app/api/oauth/youtube/callback/route");

    const response = await (GET as (request: Request) => Promise<Response>)(
      new Request("https://app.example.com/api/oauth/youtube/callback"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/connections?youtube=missing-code",
    );
  });

  test("callback clears state and redirects with a generic failure when Google fails", async () => {
    const oauthModule = await vi.importActual<typeof import("@/lib/platforms/youtube-oauth")>(
      "@/lib/platforms/youtube-oauth",
    );
    const state = oauthModule.createYouTubeOAuthState({
      userId: "user_1",
      workspaceId: "workspace_1",
      nonce: "nonce_1",
      secret: "replace-with-a-random-secret",
    });

    vi.doMock("@/lib/platforms/youtube-oauth", async () => ({
      ...(await vi.importActual<typeof import("@/lib/platforms/youtube-oauth")>(
        "@/lib/platforms/youtube-oauth",
      )),
      completeYouTubeOAuthCallback: vi.fn(async () => {
        throw new Error("Google token endpoint unavailable");
      }),
    }));

    const { GET } = await import("../../src/app/api/oauth/youtube/callback/route");
    const response = await (GET as (request: Request) => Promise<Response>)(
      new Request(
        `https://app.example.com/api/oauth/youtube/callback?code=oauth-code&state=${encodeURIComponent(state)}`,
        {
          headers: {
            cookie: "youtube_oauth_state=nonce_1",
          },
        },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/connections?youtube=oauth-failed",
    );
    expect(response.headers.get("set-cookie")).toContain("youtube_oauth_state=;");
  });

  test("callback redirects handled OAuth completion failures generically", async () => {
    const oauthModule = await vi.importActual<typeof import("@/lib/platforms/youtube-oauth")>(
      "@/lib/platforms/youtube-oauth",
    );
    const state = oauthModule.createYouTubeOAuthState({
      userId: "user_1",
      workspaceId: "workspace_1",
      nonce: "nonce_1",
      secret: "replace-with-a-random-secret",
    });

    vi.doMock("@/lib/platforms/youtube-oauth", async () => ({
      ...(await vi.importActual<typeof import("@/lib/platforms/youtube-oauth")>(
        "@/lib/platforms/youtube-oauth",
      )),
      completeYouTubeOAuthCallback: vi.fn(async () => ({
        success: false,
        reason: "missing-channel",
        message: "Google did not return a YouTube channel for this user.",
      })),
    }));

    const { GET } = await import("../../src/app/api/oauth/youtube/callback/route");
    const response = await (GET as (request: Request) => Promise<Response>)(
      new Request(
        `https://app.example.com/api/oauth/youtube/callback?code=oauth-code&state=${encodeURIComponent(state)}`,
        {
          headers: {
            cookie: "youtube_oauth_state=nonce_1",
          },
        },
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/connections?youtube=oauth-failed",
    );
    expect(response.headers.get("set-cookie")).toContain("youtube_oauth_state=;");
  });
});
