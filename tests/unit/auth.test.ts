import { beforeEach, describe, expect, test, vi } from "vitest";

describe("auth workspace bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/video_scheduler");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
  });

  test("creates a workspace and owner membership when a user has no memberships", async () => {
    const workspaceCreate = vi.fn(async () => ({ id: "workspace_1" }));
    const memberUpsert = vi.fn(async () => ({}));
    const transaction = vi.fn(async (callback) =>
      callback({
        workspace: { create: workspaceCreate },
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

    expect(workspaceCreate).toHaveBeenCalledWith({
      data: { name: "Owner's Workspace" },
      select: { id: true },
    });
    expect(memberUpsert).toHaveBeenCalledWith({
      where: {
        userId_workspaceId: {
          userId: "user_1",
          workspaceId: "workspace_1",
        },
      },
      create: {
        userId: "user_1",
        workspaceId: "workspace_1",
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
    const { authOptions } = await import("../../src/lib/auth");

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
});
