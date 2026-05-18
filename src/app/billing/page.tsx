import { CheckCircle2, CreditCard, ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { getWorkspaceForUser } from "@/lib/billing/stripe";
import { getPricingPlan, paidPricingPlans } from "@/lib/billing/pricing";

export const dynamic = "force-dynamic";

type BillingPageProps = {
  searchParams?: Promise<{
    checkout?: string;
    reason?: string;
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

  const activePlan = getPricingPlan(workspace.plan);
  const hasActiveSubscription = workspace.plan !== "beta" && Boolean(workspace.stripeSubscriptionId);
  const checkoutState = params?.checkout;
  const checkoutErrorMessage =
    checkoutState === "failed" ? getCheckoutErrorMessage(params?.reason) : null;

  return (
    <AppShell>
      <div className="max-w-4xl space-y-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-normal text-white">
            Subscription management
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-400">
            Choose the plan that fits your publishing volume, or manage the
            active subscription in Stripe.
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

        {checkoutErrorMessage ? (
          <div className="rounded-md border border-rose-300/35 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {checkoutErrorMessage}
          </div>
        ) : null}

        <section className="studio-panel rounded-md p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-semibold text-white">Workspace billing</h2>
              </div>
              <p className="text-sm leading-6 text-slate-400">
                Status:{" "}
                <span className="font-medium text-white">
                  {hasActiveSubscription ? `${activePlan.name} active` : "Beta"}
                </span>
              </p>
              <p className="text-sm leading-6 text-slate-400">
                Workspace: {workspace.name}
              </p>
              <p className="text-sm leading-6 text-slate-400">
                Monthly post cap:{" "}
                <span className="font-medium text-white">
                  {activePlan.monthlyScheduledPostLimit} scheduled posts
                </span>
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
                <input type="hidden" name="plan" value="creator" />
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

        <section className="grid gap-4 lg:grid-cols-2">
          {paidPricingPlans.map((plan) => {
            const isCurrentPlan = workspace.plan === plan.id && hasActiveSubscription;

            return (
              <article
                className={
                  plan.featured
                    ? "rounded-md border border-cyan-300/35 bg-cyan-300/[0.055] p-6 shadow-2xl shadow-cyan-950/20"
                    : "studio-panel-subtle rounded-md p-6"
                }
                key={plan.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-cyan-200">
                      {plan.eyebrow}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{plan.name}</h2>
                  </div>
                  {isCurrentPlan ? (
                    <span className="rounded-md border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
                      Current
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-semibold text-white">{plan.price}</span>
                  <span className="pb-1 text-sm text-slate-400">{plan.period}</span>
                </div>
                <p className="mt-4 min-h-12 text-sm leading-6 text-slate-400">
                  {plan.description}
                </p>

                <ul className="mt-5 grid gap-2 text-sm text-slate-200">
                  {plan.features.map((feature) => (
                    <li className="flex gap-2" key={feature}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-md border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">
                  {plan.limits.join(" • ")}
                </div>

                {hasActiveSubscription ? (
                  <form action="/api/stripe/portal" className="mt-6" method="post">
                    <button type="submit" className="studio-button-secondary w-full">
                      Manage in Stripe
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>
                ) : (
                  <form action="/api/stripe/checkout" className="mt-6" method="post">
                    <input type="hidden" name="plan" value={plan.id} />
                    <button type="submit" className="studio-button-primary w-full">
                      {plan.cta}
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </section>
      </div>
    </AppShell>
  );
}

function getCheckoutErrorMessage(reason: string | undefined) {
  if (reason === "configuration") {
    return "Stripe could not find that plan price. Double-check the saved Stripe Price ID for this plan.";
  }

  return "Stripe checkout is unavailable right now. Please try again in a moment.";
}
