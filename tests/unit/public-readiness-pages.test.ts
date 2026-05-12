import { describe, expect, test } from "vitest";

import { privacyStoredData } from "@/app/privacy/page";
import { reviewerDemoSteps } from "@/app/reviewer-demo/page";
import { failedPostChecklist } from "@/app/support/page";
import { termsTopics } from "@/app/terms/page";

describe("public launch readiness page copy", () => {
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
