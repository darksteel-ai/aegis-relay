export type PaidPlanId = "creator" | "studio";
export type BillingPlanId = "beta" | PaidPlanId;

export type PricingPlan = {
  id: BillingPlanId;
  name: string;
  eyebrow: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  featured?: boolean;
  stripePriceEnvKey?: "STRIPE_PRICE_ID_CREATOR" | "STRIPE_PRICE_ID_STUDIO" | "STRIPE_PRICE_ID_PRO";
  monthlyScheduledPostLimit: number;
  features: string[];
  limits: string[];
};

export const pricingPlans: PricingPlan[] = [
  {
    id: "beta",
    name: "Beta",
    eyebrow: "Start",
    price: "$0",
    period: "while testing",
    description: "For validating your workflow before you turn on paid publishing.",
    cta: "Current free access",
    monthlyScheduledPostLimit: 10,
    features: [
      "Connect YouTube, TikTok, and Instagram accounts",
      "Upload vertical videos",
      "Preview scheduling workflows",
      "Basic AI metadata suggestions",
    ],
    limits: ["Up to 10 scheduled posts per month", "Manual review for some platform publishing"],
  },
  {
    id: "creator",
    name: "Creator",
    eyebrow: "Most creators",
    price: "$19",
    period: "per month",
    description: "For solo creators publishing repeat short-form campaigns.",
    cta: "Start Creator",
    featured: true,
    stripePriceEnvKey: "STRIPE_PRICE_ID_CREATOR",
    monthlyScheduledPostLimit: 150,
    features: [
      "Schedule across YouTube Shorts, TikTok, and Reels",
      "Cross-platform AI titles and hashtags",
      "Connected-account status monitoring",
      "Retry failed posts from the dashboard",
    ],
    limits: ["1 workspace", "Up to 150 scheduled posts per month"],
  },
  {
    id: "studio",
    name: "Studio",
    eyebrow: "Teams",
    price: "$49",
    period: "per month",
    description: "For agencies and operators managing higher-volume short-form output.",
    cta: "Start Studio",
    stripePriceEnvKey: "STRIPE_PRICE_ID_STUDIO",
    monthlyScheduledPostLimit: 750,
    features: [
      "Everything in Creator",
      "Higher scheduling volume",
      "Priority platform-connection support",
      "More AI optimization context as platform data grows",
    ],
    limits: ["1 workspace", "Up to 750 scheduled posts per month"],
  },
];

export const paidPricingPlans = pricingPlans.filter(
  (plan): plan is PricingPlan & { id: PaidPlanId } => plan.id === "creator" || plan.id === "studio",
);

export function getPricingPlan(planId: string | null | undefined) {
  return pricingPlans.find((plan) => plan.id === planId) ?? pricingPlans[0];
}

export function getPaidPricingPlan(planId: string | null | undefined) {
  return paidPricingPlans.find((plan) => plan.id === planId) ?? null;
}

export function normalizeBillingPlan(planId: string | null | undefined): BillingPlanId {
  if (planId === "studio" || planId === "creator") {
    return planId;
  }

  if (planId === "pro") {
    return "creator";
  }

  return "beta";
}

export function getMonthlyScheduledPostLimit(planId: string | null | undefined) {
  return getPricingPlan(normalizeBillingPlan(planId)).monthlyScheduledPostLimit;
}
