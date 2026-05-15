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
  const hasActiveSubscription = isPro && Boolean(workspace.stripeSubscriptionId);
  const checkoutState = params?.checkout;

  return (
    <AppShell>
      <div className="max-w-4xl space-y-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-normal text-white">
            Subscription management
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-400">
            Upgrade the current workspace to unlock paid beta scheduling, or
            manage the active subscription in Stripe.
          </p>
        </div>

        {checkoutState === "success" ? (
          <div className="rounded-md border border-emerald-300/35 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            Checkout completed. Stripe will confirm the subscription shortly.
          </div>
        ) : null}

        {checkoutState === "cancelled" ? (
          <div className="rounded-md border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            Checkout was cancelled. Your workspace is unchanged.
          </div>
        ) : null}

        <section className="studio-panel rounded-md p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold text-white">Pro plan</h2>
              </div>
              <p className="text-sm leading-6 text-slate-400">
                Status:{" "}
                <span className="font-medium text-white">
                  {isPro ? "Active" : "Beta"}
                </span>
              </p>
              <p className="text-sm leading-6 text-slate-400">
                Workspace: {workspace.name}
              </p>
            </div>

            {hasActiveSubscription ? (
              <form action="/api/stripe/portal" method="post">
                <button
                  type="submit"
                  className="studio-button-secondary"
                >
                  Manage
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            ) : (
              <form action="/api/stripe/checkout" method="post">
                <button
                  type="submit"
                  className="studio-button-primary"
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
