import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = process.cwd();
const schema = readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
const envExample = readFileSync(path.join(root, ".env.example"), "utf8");
const envHelperPath = path.join(root, "src/lib/env.ts");
const envHelper = existsSync(envHelperPath) ? readFileSync(envHelperPath, "utf8") : "";

describe("scheduled post data model", () => {
  test("defines scheduler enums and core publish workflow models", () => {
    expect(schema).toContain("enum Platform");
    expect(schema).toContain("YOUTUBE");
    expect(schema).toContain("TIKTOK");
    expect(schema).toContain("INSTAGRAM");

    expect(schema).toContain("enum PublishStatus");
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

    for (const model of [
      "User",
      "Workspace",
      "WorkspaceMember",
      "UploadedVideo",
      "ScheduledPost",
      "PlatformPost",
      "ConnectedAccount",
      "PublishAttempt",
      "Account",
      "Session",
      "VerificationToken",
    ]) {
      expect(schema).toContain(`model ${model}`);
    }
  });

  test("keeps uniqueness rules needed for scheduling and auth adapters", () => {
    expect(schema).toContain("@@unique([scheduledPostId, platform])");
    expect(schema).toContain("@@unique([workspaceId, platform, externalId])");
    expect(schema).toContain("@@unique([provider, providerAccountId])");
    expect(schema).toContain("sessionToken String   @unique");
    expect(schema).toContain("@@unique([identifier, token])");
  });

  test("validates every environment variable listed in the template", () => {
    const requiredEnvNames = Array.from(envExample.matchAll(/^([A-Z0-9_]+)=/gm)).map(
      ([, name]) => name,
    );

    for (const name of requiredEnvNames) {
      expect(envHelper).toContain(`${name}:`);
    }
  });
});
