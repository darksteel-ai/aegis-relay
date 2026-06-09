import { describe, expect, it } from "vitest";

import { getNiche, niches, nicheSlugs } from "@/lib/niches";
import { parseWaitlistInput } from "@/lib/validation/waitlist";

describe("parseWaitlistInput", () => {
  it("accepts a valid email and known niche", () => {
    const result = parseWaitlistInput({ email: "agent@example.com", niche: "real-estate" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("agent@example.com");
      expect(result.data.niche).toBe("real-estate");
    }
  });

  it("normalizes email casing and whitespace", () => {
    const result = parseWaitlistInput({ email: "  Agent@Example.COM ", niche: "podcasters" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("agent@example.com");
    }
  });

  it("accepts the general niche for non-vertical signups", () => {
    const result = parseWaitlistInput({ email: "someone@example.com", niche: "general" });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    const result = parseWaitlistInput({ email: "not-an-email", niche: "real-estate" });

    expect(result.success).toBe(false);
  });

  it("rejects unknown niches", () => {
    const result = parseWaitlistInput({ email: "agent@example.com", niche: "crypto-traders" });

    expect(result.success).toBe(false);
  });

  it("rejects submissions with a filled honeypot field", () => {
    const result = parseWaitlistInput({
      email: "bot@example.com",
      niche: "real-estate",
      company: "Acme Bots Inc",
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(parseWaitlistInput({}).success).toBe(false);
    expect(parseWaitlistInput(null).success).toBe(false);
  });
});

describe("niches", () => {
  it("resolves every defined slug", () => {
    for (const slug of nicheSlugs) {
      expect(getNiche(slug)?.slug).toBe(slug);
    }
  });

  it("returns null for unknown slugs", () => {
    expect(getNiche("unknown")).toBeNull();
    expect(getNiche(null)).toBeNull();
  });

  it("has complete landing page copy for each niche", () => {
    for (const niche of niches) {
      expect(niche.pains.length).toBeGreaterThanOrEqual(3);
      expect(niche.workflow.length).toBeGreaterThanOrEqual(3);
      expect(niche.samplePosts.length).toBeGreaterThan(0);
      expect(niche.communities.length).toBeGreaterThan(0);
    }
  });
});
