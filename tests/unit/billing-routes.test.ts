import { beforeEach, describe, expect, test, vi } from "vitest";

const createSubscriptionCheckoutSession = vi.fn();
const createBillingPortalSession = vi.fn();
const getAuthSession = vi.fn();

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
}));

describe("billing API routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
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
    });
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
});
