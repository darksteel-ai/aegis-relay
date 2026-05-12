import { beforeEach, describe, expect, test, vi } from "vitest";

const mutation = vi.fn();

vi.mock("@/lib/convex-server", () => ({
  getConvexClient: () => ({ mutation }),
}));

describe("auth workspace bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
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

  test("derives stable auth ids from normalized email addresses", async () => {
    const { authUserIdForEmail } = await import("../../src/lib/auth");

    expect(authUserIdForEmail(" Owner@Example.com ")).toBe(
      authUserIdForEmail("owner@example.com"),
    );
    expect(authUserIdForEmail("owner@example.com")).toMatch(/^email-[a-f0-9]{32}$/);
  });

  test("adds the database user id to the session", async () => {
    const { createAuthOptions } = await import("../../src/lib/auth");
    const authOptions = createAuthOptions();

    const session = await authOptions.callbacks?.session?.({
      session: {
        expires: "2026-06-01T00:00:00.000Z",
        user: { id: "", email: "owner@example.com", name: "Owner", image: null },
      },
      user: {
        id: "user_1",
        email: "owner@example.com",
        emailVerified: null,
        name: "Owner",
        image: null,
      },
      token: { sub: "user_1" },
      newSession: undefined,
      trigger: "update",
    });

    expect((session?.user as { id?: string } | undefined)?.id).toBe("user_1");
  });

  test("requires a validated NextAuth secret when creating auth options", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");

    const { createAuthOptions } = await import("../../src/lib/auth");

    expect(() => createAuthOptions({})).toThrow("NEXTAUTH_SECRET");
  });

  test("uses credentials auth in production without SMTP settings", async () => {
    const { createAuthOptions } = await import("../../src/lib/auth");

    const options = createAuthOptions({
        NODE_ENV: "production",
        NEXTAUTH_SECRET: "replace-with-a-random-secret",
      });

    expect(options.providers[0]?.type).toBe("credentials");
  });
});
