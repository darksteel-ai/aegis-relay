import { CreditCard, ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";

type BillingPageProps = {
  searchParams?: Promise<{
    checkout?: string;
  }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [workspace, params] = await Promise.all([
    getWorkspaceForUser(session.user.id),
    searchParams,
  ]);

  if (!workspace) {
    redirect("/dashboard");
  }

  const isPro = workspace.plan === "pro";
  const checkoutState = params?.checkout;

  return (
    <AppShell>
      <div className="max-w-3xl space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-500">Billing</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Subscription management
          </h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-600">
            Upgrade the current workspace to unlock paid beta scheduling, or
            manage the active subscription in Stripe.
          </p>
        </div>

        {checkoutState === "success" ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Checkout completed. Stripe will confirm the subscription shortly.
          </div>
        ) : null}

        {checkoutState === "cancelled" ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Checkout was cancelled. Your workspace is unchanged.
          </div>
        ) : null}

        <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-neutral-500" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Pro plan</h2>
              </div>
              <p className="text-sm leading-6 text-neutral-600">
                Status:{" "}
                <span className="font-medium text-neutral-950">
                  {isPro ? "Active" : "Beta"}
                </span>
              </p>
              <p className="text-sm leading-6 text-neutral-600">
                Workspace: {workspace.name}
              </p>
            </div>

            {workspace.stripeCustomerId ? (
              <form action="/api/stripe/portal" method="post">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100"
                >
                  Manage
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <form action="/api/stripe/checkout" method="post">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  Start Pro
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
