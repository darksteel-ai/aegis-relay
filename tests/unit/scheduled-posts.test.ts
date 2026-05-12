import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

const root = process.cwd();
const schema = readFileSync(path.join(root, "convex/schema.ts"), "utf8");
const envExample = readFileSync(path.join(root, ".env.example"), "utf8");
const envHelperPath = path.join(root, "src/lib/env.ts");
const envHelper = existsSync(envHelperPath) ? readFileSync(envHelperPath, "utf8") : "";

describe("scheduled post data model", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("defines scheduler enums and core publish workflow models", () => {
    expect(schema).toContain("YOUTUBE");
    expect(schema).toContain("TIKTOK");
    expect(schema).toContain("INSTAGRAM");

    for (const status of [
      "DRAFT",
      "SCHEDULED",
      "PROCESSING",
      "PUBLISHED",
      "FAILED",
      "RETRYING",
      "BLOCKED",
      "APPROVAL_PENDING",
    ]) {
      expect(schema).toContain(status);
    }

    for (const table of [
      "users",
      "workspaces",
      "workspaceMembers",
      "uploadedVideos",
      "scheduledPosts",
      "platformPosts",
      "connectedAccounts",
      "publishAttempts",
    ]) {
      expect(schema).toContain(`${table}: defineTable`);
    }
  });

  test("keeps indexes needed for scheduling, uploads, and platform connections", () => {
    expect(schema).toContain('index("by_auth_user"');
    expect(schema).toContain('index("by_storage_key"');
    expect(schema).toContain('index("by_workspace_platform_external"');
    expect(schema).toContain('index("by_status_scheduled"');
  });

  test("validates every environment variable listed in the template", () => {
    const requiredEnvNames = Array.from(envExample.matchAll(/^([A-Z0-9_]+)=/gm)).map(
      ([, name]) => name,
    );

    for (const name of requiredEnvNames) {
      expect(envHelper).toContain(`${name}:`);
    }

    for (const name of ["STRIPE_PRICE_ID_PRO", "S3_ENDPOINT", "GOOGLE_REDIRECT_URI"]) {
      expect(envHelper).toContain(`${name}:`);
    }
  });

  test("does not require integration secrets when importing env helpers", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://example.convex.cloud");
    vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");

    await expect(import("../../src/lib/env")).resolves.toHaveProperty("env");
  });
});
