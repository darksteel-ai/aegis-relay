import { beforeEach, describe, expect, test, vi } from "vitest";

const getAuthSession = vi.fn();
const findFirst = vi.fn();
const upsert = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession,
}));

vi.mock("@/lib/db", () => ({
  db: {
    workspaceMember: { findFirst },
    connectedAccount: { upsert },
  },
}));

describe("YouTube OAuth routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/video_scheduler");
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id.apps.googleusercontent.com");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "https://app.example.com/api/oauth/youtube/callback");
    getAuthSession.mockResolvedValue({
      user: { id: "user_1", email: "owner@example.com" },
    });
    findFirst.mockResolvedValue({ workspaceId: "workspace_1" });
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
});
