import { describe, expect, test } from "vitest";

import {
  getMonthlyScheduledPostLimit,
  normalizeBillingPlan,
  pricingPlans,
} from "@/lib/billing/pricing";

describe("pricing plan limits", () => {
  test("normalizes legacy and current billing plans", () => {
    expect(normalizeBillingPlan("pro")).toBe("creator");
    expect(normalizeBillingPlan("creator")).toBe("creator");
    expect(normalizeBillingPlan("studio")).toBe("studio");
    expect(normalizeBillingPlan("unknown")).toBe("beta");
  });

  test("matches monthly post caps advertised in pricing", () => {
    expect(getMonthlyScheduledPostLimit("beta")).toBe(10);
    expect(getMonthlyScheduledPostLimit("creator")).toBe(150);
    expect(getMonthlyScheduledPostLimit("pro")).toBe(150);
    expect(getMonthlyScheduledPostLimit("studio")).toBe(750);
    expect(pricingPlans.map((plan) => [plan.id, plan.monthlyScheduledPostLimit])).toEqual([
      ["beta", 10],
      ["creator", 150],
      ["studio", 750],
    ]);
  });
});
