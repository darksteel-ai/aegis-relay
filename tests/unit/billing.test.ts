import { describe, expect, test, vi } from "vitest";

describe("billing helpers", () => {
  test("creates a subscription checkout session for the user's workspace", async () => {
    const stripe = {
      checkout: {
        sessions: {
          create: vi.fn(async () => ({ id: "cs_test_1", url: "https://checkout.stripe.test/session" })),
        },
      },
    };
    const db = {
      workspaceMember: {
        findFirst: vi.fn(async () => ({
          workspaceId: "workspace_1",
          workspace: {
            id: "workspace_1",
            name: "Creator Studio",
            plan: "beta",
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
        })),
      },
    };
    const { createSubscriptionCheckoutSession } = await import("../../src/lib/billing/stripe");

    const checkout = await createSubscriptionCheckoutSession({
      db,
      stripe,
      user: { id: "user_1", email: "owner@example.com" },
      origin: "http://localhost:3000",
      priceId: "price_pro",
    });

    expect(checkout.url).toBe("https://checkout.stripe.test/session");
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
      mode: "subscription",
      customer_email: "owner@example.com",
      line_items: [{ price: "price_pro", quantity: 1 }],
      success_url: "http://localhost:3000/billing?checkout=success",
      cancel_url: "http://localhost:3000/billing?checkout=cancelled",
      metadata: { workspaceId: "workspace_1" },
      subscription_data: { metadata: { workspaceId: "workspace_1" } },
    });
  });

  test("uses an existing Stripe customer for checkout when the workspace has one", async () => {
    const stripe = {
      checkout: {
        sessions: {
          create: vi.fn(async () => ({ id: "cs_test_1", url: "https://checkout.stripe.test/session" })),
        },
      },
    };
    const db = {
      workspaceMember: {
        findFirst: vi.fn(async () => ({
          workspaceId: "workspace_1",
          workspace: {
            id: "workspace_1",
            name: "Creator Studio",
            plan: "beta",
            stripeCustomerId: "cus_123",
            stripeSubscriptionId: null,
          },
        })),
      },
    };
    const { createSubscriptionCheckoutSession } = await import("../../src/lib/billing/stripe");

    await createSubscriptionCheckoutSession({
      db,
      stripe,
      user: { id: "user_1", email: "owner@example.com" },
      origin: "http://localhost:3000",
      priceId: "price_pro",
    });

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
      }),
    );
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        customer_email: expect.any(String),
      }),
    );
  });

  test("stores workspace billing identifiers after first checkout completion", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const { handleStripeEvent } = await import("../../src/lib/billing/stripe");

    await handleStripeEvent(
      {
        type: "checkout.session.completed",
        data: {
          object: {
            mode: "subscription",
            customer: "cus_123",
            subscription: "sub_123",
            metadata: { workspaceId: "workspace_1" },
          },
        },
      },
      { workspace: { updateMany } },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "workspace_1",
        OR: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: "sub_123" }],
      },
      data: {
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        plan: "pro",
      },
    });
  });

  test("does not overwrite a newer subscription from a stale checkout completion", async () => {
    const workspaces = new Map([
      [
        "workspace_1",
        {
          id: "workspace_1",
          stripeCustomerId: "cus_new",
          stripeSubscriptionId: "sub_new",
          plan: "pro",
        },
      ],
    ]);
    const updateMany = vi.fn(async (args) => {
      let count = 0;

      for (const workspace of workspaces.values()) {
        const matchesId = args.where.id === workspace.id;
        const matchesSubscription =
          args.where.OR?.some((condition: { stripeSubscriptionId: string | null }) =>
            condition.stripeSubscriptionId === workspace.stripeSubscriptionId,
          ) ?? true;

        if (matchesId && matchesSubscription) {
          count += 1;
          Object.assign(workspace, args.data);
        }
      }

      return { count };
    });
    const { handleStripeEvent } = await import("../../src/lib/billing/stripe");

    await handleStripeEvent(
      {
        type: "checkout.session.completed",
        data: {
          object: {
            mode: "subscription",
            customer: "cus_old",
            subscription: "sub_old",
            metadata: { workspaceId: "workspace_1" },
          },
        },
      },
      { workspace: { updateMany } },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "workspace_1",
        OR: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: "sub_old" }],
      },
      data: {
        stripeCustomerId: "cus_old",
        stripeSubscriptionId: "sub_old",
        plan: "pro",
      },
    });
    expect(workspaces.get("workspace_1")).toEqual({
      id: "workspace_1",
      stripeCustomerId: "cus_new",
      stripeSubscriptionId: "sub_new",
      plan: "pro",
    });
  });

  test("downgrades a workspace when a subscription is deleted", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const { handleStripeEvent } = await import("../../src/lib/billing/stripe");

    await handleStripeEvent(
      {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_123",
            metadata: { workspaceId: "workspace_1" },
          },
        },
      },
      { workspace: { updateMany } },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "workspace_1", stripeSubscriptionId: "sub_123" },
      data: {
        stripeSubscriptionId: null,
        plan: "beta",
      },
    });
  });

  test("does not downgrade a newer subscription from a stale deleted event", async () => {
    const workspaces = new Map([
      [
        "workspace_1",
        {
          id: "workspace_1",
          stripeSubscriptionId: "sub_new",
          plan: "pro",
        },
      ],
    ]);
    const updateMany = vi.fn(async (args) => {
      let count = 0;

      for (const workspace of workspaces.values()) {
        const matchesId = !args.where.id || args.where.id === workspace.id;
        const matchesSubscription =
          !args.where.stripeSubscriptionId ||
          args.where.stripeSubscriptionId === workspace.stripeSubscriptionId;

        if (matchesId && matchesSubscription) {
          count += 1;
          Object.assign(workspace, args.data);
        }
      }

      return { count };
    });
    const { handleStripeEvent } = await import("../../src/lib/billing/stripe");

    await handleStripeEvent(
      {
        type: "customer.subscription.deleted",
        data: {
          object: {
            id: "sub_old",
            metadata: { workspaceId: "workspace_1" },
          },
        },
      },
      { workspace: { updateMany } },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "workspace_1", stripeSubscriptionId: "sub_old" },
      data: {
        stripeSubscriptionId: null,
        plan: "beta",
      },
    });
    expect(workspaces.get("workspace_1")).toEqual({
      id: "workspace_1",
      stripeSubscriptionId: "sub_new",
      plan: "pro",
    });
  });

  test("does not mark a newer subscription beta from a stale updated event", async () => {
    const updateMany = vi.fn(async () => ({ count: 0 }));
    const { handleStripeEvent } = await import("../../src/lib/billing/stripe");

    await handleStripeEvent(
      {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_old",
            status: "canceled",
            metadata: { workspaceId: "workspace_1" },
          },
        },
      },
      { workspace: { updateMany } },
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "workspace_1", stripeSubscriptionId: "sub_old" },
      data: { plan: "beta" },
    });
  });
});
