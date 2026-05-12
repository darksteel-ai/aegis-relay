import Stripe from "stripe";
import type { Id } from "../../../convex/_generated/dataModel";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { getStripeEnv } from "@/lib/env";

type BillingUser = {
  id: string;
  email?: string | null;
};

type WorkspaceRecord = {
  id: string;
  name: string;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeCanceledSubscriptionId: string | null;
};

type WorkspaceMembershipDb = {
  workspaceMember: {
    findFirst(args: {
      where: { userId: string };
      include: { workspace: true };
      orderBy: { id: "asc" };
    }): Promise<{ workspaceId: string; workspace: WorkspaceRecord } | null>;
  };
};

type WorkspaceUpdateWhere = {
  id?: string;
  stripeSubscriptionId?: string;
  OR?: Array<{
    stripeSubscriptionId: string | null;
    NOT?: { stripeCanceledSubscriptionId: string };
  }>;
};

type WorkspaceUpdateDb = {
  workspace: {
    updateMany?(args: {
      where: WorkspaceUpdateWhere;
      data: {
        stripeCustomerId?: string;
        stripeSubscriptionId?: string | null;
        stripeCanceledSubscriptionId?: string | null;
        plan: "beta" | "pro";
      };
    }): Promise<unknown>;
  };
};

type CheckoutStripe = {
  checkout: {
    sessions: {
      create(args: Stripe.Checkout.SessionCreateParams): Promise<{ url: string | null }>;
    };
  };
};

type PortalStripe = {
  billingPortal: {
    sessions: {
      create(args: Stripe.BillingPortal.SessionCreateParams): Promise<{ url: string }>;
    };
  };
};

type StripeEvent = {
  type: string;
  data: { object: unknown };
};

let stripeClient: Stripe | null = null;

export class BillingError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "BillingError";
  }
}

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeEnv().STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
    });
  }

  return stripeClient;
}

export async function getWorkspaceForUser(
  userId: string,
  database?: WorkspaceMembershipDb,
) {
  if (!database) {
    const workspace = await getConvexClient().query(convexApi.workspaces.getForUser, {
      userId,
    });
    return workspace;
  }

  const membership = await database.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { id: "asc" },
  });

  return membership?.workspace ?? null;
}

export async function createSubscriptionCheckoutSession({
  db,
  stripe = getStripe(),
  user,
  appUrl,
  priceId = getStripeEnv().STRIPE_PRICE_ID_PRO,
}: {
  db?: WorkspaceMembershipDb;
  stripe?: CheckoutStripe;
  user: BillingUser;
  appUrl: string;
  priceId?: string;
}) {
  const workspace = await getWorkspaceForUser(user.id, db);

  if (!workspace) {
    throw new BillingError("Workspace not found.", 404);
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?checkout=success`,
    cancel_url: `${appUrl}/billing?checkout=cancelled`,
    metadata: { workspaceId: workspace.id },
    subscription_data: { metadata: { workspaceId: workspace.id } },
  };

  if (workspace.stripeCustomerId) {
    sessionParams.customer = workspace.stripeCustomerId;
  } else if (user.email) {
    sessionParams.customer_email = user.email;
  }

  const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

  if (!checkoutSession.url) {
    throw new BillingError("Stripe did not return a checkout URL.", 502);
  }

  return { ...checkoutSession, url: checkoutSession.url };
}

export async function createBillingPortalSession({
  db,
  stripe = getStripe(),
  user,
  appUrl,
}: {
  db?: WorkspaceMembershipDb;
  stripe?: PortalStripe;
  user: BillingUser;
  appUrl: string;
}) {
  const workspace = await getWorkspaceForUser(user.id, db);

  if (!workspace) {
    throw new BillingError("Workspace not found.", 404);
  }

  if (!workspace.stripeCustomerId) {
    throw new BillingError("No Stripe customer exists for this workspace.", 400);
  }

  return stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${appUrl}/billing`,
  });
}

export async function handleStripeEvent(
  event: StripeEvent,
  database?: WorkspaceUpdateDb,
) {
  if (event.type === "checkout.session.completed") {
    await handleCheckoutSessionCompleted(event.data.object, database);
    return;
  }

  if (event.type === "customer.subscription.updated") {
    await handleSubscriptionUpdated(event.data.object, database);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    await handleSubscriptionDeleted(event.data.object, database);
  }
}

async function handleCheckoutSessionCompleted(
  payload: unknown,
  database?: WorkspaceUpdateDb,
) {
  const session = payload as Stripe.Checkout.Session;

  if (session.mode !== "subscription") {
    return;
  }

  const workspaceId = session.metadata?.workspaceId;
  const customerId = stripeId(session.customer);
  const subscriptionId = stripeId(session.subscription);

  if (!workspaceId || !customerId || !subscriptionId) {
    throw new BillingError("Checkout session is missing workspace billing metadata.", 400);
  }

  if (!database) {
    await getConvexClient().mutation(convexApi.billing.checkoutCompleted, {
      workspaceId: workspaceId as Id<"workspaces">,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    });
    return;
  }

  if (!database.workspace.updateMany) {
    throw new BillingError("Workspace updateMany operation is unavailable.", 500);
  }

  await database.workspace.updateMany({
    where: {
      id: workspaceId,
      OR: [
        {
          stripeSubscriptionId: null,
          NOT: { stripeCanceledSubscriptionId: subscriptionId },
        },
        { stripeSubscriptionId: subscriptionId },
      ],
    },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeCanceledSubscriptionId: null,
      plan: "pro",
    },
  });
}

async function handleSubscriptionUpdated(payload: unknown, database?: WorkspaceUpdateDb) {
  const subscription = payload as Stripe.Subscription;
  const subscriptionId = subscription.id;
  const workspaceId = subscription.metadata?.workspaceId;
  const activeStatuses = new Set(["active", "trialing"]);
  const plan = activeStatuses.has(subscription.status) ? "pro" : "beta";
  const isCanceled = subscription.status === "canceled";

  if (!database) {
    await getConvexClient().mutation(convexApi.billing.subscriptionChanged, {
      workspaceId: workspaceId as Id<"workspaces"> | undefined,
      stripeSubscriptionId: subscriptionId,
      status: subscription.status,
    });
    return;
  }

  if (!database.workspace.updateMany) {
    throw new BillingError("Workspace updateMany operation is unavailable.", 500);
  }

  await database.workspace.updateMany({
    where: isCanceled
      ? subscriptionCancellationWorkspaceWhere(workspaceId, subscriptionId)
      : subscriptionWorkspaceWhere(workspaceId, subscriptionId),
    data: {
      plan,
      ...(plan === "pro" ? { stripeCanceledSubscriptionId: null } : {}),
      ...(isCanceled
        ? {
          stripeSubscriptionId: null,
          stripeCanceledSubscriptionId: subscriptionId,
        }
        : {}),
    },
  });
}

async function handleSubscriptionDeleted(payload: unknown, database?: WorkspaceUpdateDb) {
  const subscription = payload as Stripe.Subscription;
  const subscriptionId = subscription.id;
  const workspaceId = subscription.metadata?.workspaceId;

  if (!database) {
    await getConvexClient().mutation(convexApi.billing.subscriptionChanged, {
      workspaceId: workspaceId as Id<"workspaces"> | undefined,
      stripeSubscriptionId: subscriptionId,
      status: "canceled",
    });
    return;
  }

  if (!database.workspace.updateMany) {
    throw new BillingError("Workspace updateMany operation is unavailable.", 500);
  }

  await database.workspace.updateMany({
    where: subscriptionCancellationWorkspaceWhere(workspaceId, subscriptionId),
    data: {
      stripeSubscriptionId: null,
      stripeCanceledSubscriptionId: subscriptionId,
      plan: "beta",
    },
  });
}

function subscriptionCancellationWorkspaceWhere(
  workspaceId: string | undefined,
  subscriptionId: string,
) {
  if (workspaceId) {
    return {
      id: workspaceId,
      OR: [{ stripeSubscriptionId: null }, { stripeSubscriptionId: subscriptionId }],
    };
  }

  return { stripeSubscriptionId: subscriptionId };
}

function subscriptionWorkspaceWhere(workspaceId: string | undefined, subscriptionId: string) {
  if (workspaceId) {
    return { id: workspaceId, stripeSubscriptionId: subscriptionId };
  }

  return { stripeSubscriptionId: subscriptionId };
}

function stripeId(value: string | { id?: string } | null | undefined) {
  if (typeof value === "string") {
    return value;
  }

  return value?.id ?? null;
}
