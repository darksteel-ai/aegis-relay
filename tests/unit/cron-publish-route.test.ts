import { beforeEach, describe, expect, test, vi } from "vitest";

const publishDuePosts = vi.fn();

vi.mock("@/lib/publishing/scheduler", () => ({
  publishDuePosts,
}));

describe("publish due posts cron route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
  });

  test("rejects calls without the cron secret", async () => {
    const { GET } = await import("../../src/app/api/cron/publish-due-posts/route");

    const response = await GET(
      new Request("https://app.example.com/api/cron/publish-due-posts"),
    );

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(response.status).toBe(401);
    expect(publishDuePosts).not.toHaveBeenCalled();
  });

  test("publishes due posts when the cron secret matches", async () => {
    publishDuePosts.mockResolvedValue({ processed: 2 });
    const { GET } = await import("../../src/app/api/cron/publish-due-posts/route");

    const response = await GET(
      new Request("https://app.example.com/api/cron/publish-due-posts", {
        headers: { authorization: "Bearer test-cron-secret" },
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: true, processed: 2 });
    expect(response.status).toBe(200);
    expect(publishDuePosts).toHaveBeenCalledTimes(1);
  });
});
