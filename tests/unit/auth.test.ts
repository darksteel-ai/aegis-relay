import { beforeEach, describe, expect, test, vi } from "vitest";

describe("auth workspace bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/video_scheduler");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
  });

  test("creates a workspace and owner membership when a user has no memberships", async () => {
    const workspaceUpsert = vi.fn(async () => ({ id: "bootstrap-user_1" }));
    const memberUpsert = vi.fn(async () => ({}));
    const transaction = vi.fn(async (callback) =>
      callback({
        workspace: { upsert: workspaceUpsert },
        workspaceMember: { upsert: memberUpsert },
      }),
    );

    const { ensureWorkspaceForUser } = await import("../../src/lib/auth");

    await ensureWorkspaceForUser(
      { id: "user_1", email: "owner@example.com", name: "Owner" },
      {
        workspaceMember: { findFirst: vi.fn(async () => null) },
        $transaction: transaction,
      },
    );

    expect(workspaceUpsert).toHaveBeenCalledWith({
      where: { id: "bootstrap-user_1" },
      create: { id: "bootstrap-user_1", name: "Owner's Workspace" },
      update: {},
      select: { id: true },
    });
    expect(memberUpsert).toHaveBeenCalledWith({
      where: {
        userId_workspaceId: {
          userId: "user_1",
          workspaceId: "bootstrap-user_1",
        },
      },
      create: {
        userId: "user_1",
        workspaceId: "bootstrap-user_1",
        role: "owner",
      },
      update: {},
    });
  });

  test("does not create a duplicate workspace member when one already exists", async () => {
    const transaction = vi.fn();
    const { ensureWorkspaceForUser } = await import("../../src/lib/auth");

    await ensureWorkspaceForUser(
      { id: "user_1", email: "owner@example.com", name: null },
      {
        workspaceMember: {
          findFirst: vi.fn(async () => ({
            id: "member_1",
            userId: "user_1",
            workspaceId: "workspace_1",
          })),
        },
        $transaction: transaction,
      },
    );

    expect(transaction).not.toHaveBeenCalled();
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
      token: {},
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

  test("requires email delivery settings in production", async () => {
    const { createAuthOptions } = await import("../../src/lib/auth");

    expect(() =>
      createAuthOptions({
        NODE_ENV: "production",
        NEXTAUTH_SECRET: "replace-with-a-random-secret",
      }),
    ).toThrow("EMAIL_SERVER");
  });
});
