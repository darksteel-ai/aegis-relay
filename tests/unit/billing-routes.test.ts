import { beforeEach, describe, expect, test, vi } from "vitest";

const createSubscriptionCheckoutSession = vi.fn();
const createBillingPortalSession = vi.fn();
const getAuthSession = vi.fn();
const getStripe = vi.fn();

vi.mock("@/lib/auth", () => ({
  getAuthSession,
}));

vi.mock("@/lib/billing/stripe", () => ({
  BillingError: class BillingError extends Error {
    constructor(
      message: string,
      readonly status = 400,
    ) {
      super(message);
    }
  },
  createBillingPortalSession,
  createSubscriptionCheckoutSession,
  getStripe,
}));

describe("billing API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_replace_me");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    getAuthSession.mockResolvedValue({
      user: { id: "user_1", email: "owner@example.com" },
    });
  });

  test("checkout ignores the request origin when building Stripe return URLs", async () => {
    createSubscriptionCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.test/session",
    });
    const { POST } = await import("../../src/app/api/stripe/checkout/route");

    await (POST as (request: Request) => Promise<Response>)(
      new Request("https://evil.example.com/api/stripe/checkout", { method: "POST" }),
    );

    expect(createSubscriptionCheckoutSession).toHaveBeenCalledWith({
      user: { id: "user_1", email: "owner@example.com" },
      appUrl: "https://app.example.com",
      planId: "creator",
    });
  });

  test("checkout redirects direct visits back to billing", async () => {
    const { GET } = await import("../../src/app/api/stripe/checkout/route");

    const response = GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.example.com/billing");
  });

  test("checkout redirects Stripe price errors to billing with a clear state", async () => {
    createSubscriptionCheckoutSession.mockRejectedValue({
      code: "resource_missing",
      message: "No such price",
    });
    const { POST } = await import("../../src/app/api/stripe/checkout/route");

    const response = await (POST as (request: Request) => Promise<Response>)(
      new Request("https://app.example.com/api/stripe/checkout", { method: "POST" }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/billing?checkout=failed&reason=configuration",
    );
  });

  test("portal ignores the request origin when building Stripe return URLs", async () => {
    createBillingPortalSession.mockResolvedValue({
      url: "https://billing.stripe.test/session",
    });
    const { POST } = await import("../../src/app/api/stripe/portal/route");

    await (POST as (request: Request) => Promise<Response>)(
      new Request("https://evil.example.com/api/stripe/portal", { method: "POST" }),
    );

    expect(createBillingPortalSession).toHaveBeenCalledWith({
      user: { id: "user_1", email: "owner@example.com" },
      appUrl: "https://app.example.com",
    });
  });

  test("webhook reports missing Stripe webhook secret clearly", async () => {
    const { POST } = await import("../../src/app/api/webhooks/stripe/route");

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=test" },
        body: "{}",
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Stripe webhook is not configured.",
    });
    expect(response.status).toBe(503);
    expect(getStripe).not.toHaveBeenCalled();
  });
});
