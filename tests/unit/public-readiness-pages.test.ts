import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  betaPolicyNotice,
  metadata as privacyMetadata,
  privacyStoredData,
} from "@/app/privacy/page";
import { reviewerDemoSteps } from "@/app/reviewer-demo/page";
import {
  betaSupportContact,
  betaSupportNotice,
  failedPostChecklist,
  metadata as supportMetadata,
} from "@/app/support/page";
import {
  betaTermsNotice,
  metadata as termsMetadata,
  termsTopics,
} from "@/app/terms/page";

const root = process.cwd();
const publicReadinessFiles = [
  ".env.example",
  "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx",
  "src/app/dashboard/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/terms/page.tsx",
  "src/app/support/page.tsx",
  "src/app/reviewer-demo/page.tsx",
  "src/lib/auth.ts",
].map((filePath) => ({
  filePath,
  contents: readFileSync(path.join(root, filePath), "utf8"),
}));

describe("public launch readiness page copy", () => {
  test("beta notices are externally coherent", () => {
    expect(betaPolicyNotice).toBe(
      "Beta policy notice: this page describes the current beta service and should be reviewed by counsel before public launch.",
    );
    expect(betaTermsNotice).toBe(betaPolicyNotice);
    expect(betaSupportNotice).toBe(betaPolicyNotice);
    expect(betaSupportContact).toBe(
      "Use the support contact configured in your beta invitation.",
    );
  });

  test("public constants avoid internal launch-readiness wording", () => {
    const copy = [
      String(privacyMetadata.description),
      String(termsMetadata.description),
      String(supportMetadata.description),
      betaPolicyNotice,
      betaTermsNotice,
      betaSupportNotice,
      betaSupportContact,
      ...privacyStoredData,
      ...termsTopics,
      ...failedPostChecklist,
      ...reviewerDemoSteps,
    ].join(" ");

    expect(copy).not.toMatch(/\b(draft|placeholder|unresolved|TBD|replace)\b/i);
    expect(copy).not.toContain(".example");
    expect(copy).not.toContain("support@");
  });

  test("public and config files avoid fake public placeholders", () => {
    const combined = publicReadinessFiles
      .map(({ contents }) => contents)
      .join("\n");

    expect(combined).not.toContain(".example");
    expect(combined).not.toContain("example.com");
    expect(combined).not.toContain("you@example.com");
    expect(combined).not.toContain("no-reply@example.com");
    expect(combined).not.toContain("Schedule videos across every channel");
  });

  test("privacy copy lists the beta data categories and token encryption", () => {
    const copy = privacyStoredData.join(" ");

    expect(copy).toContain("Billing references");
    expect(copy).toContain("Uploaded video metadata and storage keys");
    expect(copy).toContain("Connected-platform authorization data");
    expect(copy).toContain("access or refresh tokens");
  });

  test("terms copy covers platform dependencies and publishing limits", () => {
    const copy = termsTopics.join(" ");

    expect(copy).toContain("platform permissions");
    expect(copy).toContain("content rights");
    expect(copy).toContain("cannot guarantee");
    expect(copy).toContain("Subscriptions and payments");
  });

  test("support copy gives failed post and connection troubleshooting", () => {
    const copy = failedPostChecklist.join(" ");

    expect(copy).toContain("Open Connections");
    expect(copy).toContain("Reconnect YouTube");
    expect(copy).toContain("Inspect the post detail page");
    expect(copy).toContain("Use retry");
  });

  test("reviewer demo copy walks through the expected review flow", () => {
    const copy = reviewerDemoSteps.join(" ");

    expect(copy).toContain("Sign in");
    expect(copy).toContain("connect a YouTube channel");
    expect(copy).toContain("upload a short vertical video");
    expect(copy).toContain("select YouTube Shorts");
    expect(copy).toContain("post detail page");
  });
});
