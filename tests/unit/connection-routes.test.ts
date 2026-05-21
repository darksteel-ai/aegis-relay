import { beforeEach, describe, expect, test, vi } from "vitest";

const getAuthSession = vi.fn();
const mutation = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession,
}));

vi.mock("@/lib/convex-server", () => ({
  getConvexClient: () => ({ mutation }),
}));

describe("connection API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getAuthSession.mockResolvedValue({
      user: { id: "user_1", email: "owner@example.com" },
    });
    mutation.mockResolvedValue({ disconnected: true });
  });

  test("disconnect rejects signed-out users", async () => {
    getAuthSession.mockResolvedValue(null);
    const { POST } = await import(
      "../../src/app/api/connections/[accountId]/disconnect/route"
    );

    const response = await POST(
      new Request("https://app.example.com/api/connections/account_1/disconnect", {
        method: "POST",
      }),
      { params: Promise.resolve({ accountId: "account_1" }) },
    );

    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(response.status).toBe(401);
    expect(mutation).not.toHaveBeenCalled();
  });

  test("disconnect removes the selected account for the signed-in user", async () => {
    const { POST } = await import(
      "../../src/app/api/connections/[accountId]/disconnect/route"
    );

    const response = await POST(
      new Request("https://app.example.com/api/connections/account_1/disconnect", {
        method: "POST",
      }),
      { params: Promise.resolve({ accountId: "account_1" }) },
    );

    await expect(response.json()).resolves.toEqual({ disconnected: true });
    expect(response.status).toBe(200);
    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      userId: "user_1",
      accountId: "account_1",
    });
  });

  test("disconnect redirects browser form submissions back to connections", async () => {
    const { POST } = await import(
      "../../src/app/api/connections/[accountId]/disconnect/route"
    );

    const response = await POST(
      new Request("https://app.example.com/api/connections/account_1/disconnect", {
        method: "POST",
        headers: { accept: "text/html" },
      }),
      { params: Promise.resolve({ accountId: "account_1" }) },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/connections?connection=disconnected",
    );
  });
});
