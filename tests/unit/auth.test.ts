import { beforeEach, describe, expect, test, vi } from "vitest";

const mutation = vi.fn();
const currentUser = vi.fn();

vi.mock("@/lib/convex-server", () => ({
  getConvexClient: () => ({ mutation }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser,
}));

describe("Clerk auth workspace bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_replace");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_replace");
  });

  test("ensures a Convex workspace for an authenticated user", async () => {
    const { ensureWorkspaceForUser } = await import("../../src/lib/auth");

    await ensureWorkspaceForUser({ id: "user_1", email: "owner@example.com", name: "Owner" });

    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      userId: "user_1",
      email: "owner@example.com",
      name: "Owner",
      image: undefined,
    });
  });

  test("returns null when Clerk has no current user", async () => {
    currentUser.mockResolvedValue(null);
    const { getAuthSession } = await import("../../src/lib/auth");

    await expect(getAuthSession()).resolves.toBeNull();
    expect(mutation).not.toHaveBeenCalled();
  });

  test("creates an app session and workspace for the current Clerk user", async () => {
    currentUser.mockResolvedValue({
      id: "user_clerk_1",
      primaryEmailAddress: { emailAddress: "owner@example.com" },
      emailAddresses: [],
      fullName: "Owner Example",
      username: null,
      imageUrl: "https://img.clerk.test/avatar.png",
    });
    const { getAuthSession } = await import("../../src/lib/auth");

    await expect(getAuthSession()).resolves.toEqual({
      user: {
        id: "user_clerk_1",
        email: "owner@example.com",
        name: "Owner Example",
        image: "https://img.clerk.test/avatar.png",
      },
    });
    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      userId: "user_clerk_1",
      email: "owner@example.com",
      name: "Owner Example",
      image: "https://img.clerk.test/avatar.png",
    });
  });
});
