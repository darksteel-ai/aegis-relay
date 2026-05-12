import { describe, expect, test, vi } from "vitest";

import {
  MAX_SHORT_FORM_DURATION_SECONDS,
  MAX_SHORT_FORM_FILE_SIZE_BYTES,
  validateShortFormVideo,
} from "@/lib/validation/video";

describe("short-form video validation", () => {
  test("accepts a vertical mp4 within beta limits", () => {
    const result = validateShortFormVideo({
      contentType: "video/mp4",
      sizeBytes: MAX_SHORT_FORM_FILE_SIZE_BYTES,
      width: 1080,
      height: 1920,
      durationSeconds: MAX_SHORT_FORM_DURATION_SECONDS,
    });

    expect(result.ok).toBe(true);
  });

  test("accepts a mov when dimensions and duration are not known yet", () => {
    const result = validateShortFormVideo({
      contentType: "video/quicktime",
      sizeBytes: 1024,
    });

    expect(result.ok).toBe(true);
  });

  test("rejects unsupported video mime types", () => {
    const result = validateShortFormVideo({
      contentType: "video/webm",
      sizeBytes: 1024,
      width: 1080,
      height: 1920,
      durationSeconds: 30,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Upload an MP4 or MOV video."],
    });
  });

  test("rejects files larger than 500MB", () => {
    const result = validateShortFormVideo({
      contentType: "video/mp4",
      sizeBytes: MAX_SHORT_FORM_FILE_SIZE_BYTES + 1,
      width: 1080,
      height: 1920,
      durationSeconds: 30,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Video must be 500MB or smaller."],
    });
  });

  test("rejects horizontal videos when dimensions are known", () => {
    const result = validateShortFormVideo({
      contentType: "video/mp4",
      sizeBytes: 1024,
      width: 1920,
      height: 1080,
      durationSeconds: 30,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Video must be vertical."],
    });
  });

  test("rejects square videos when dimensions are known", () => {
    const result = validateShortFormVideo({
      contentType: "video/mp4",
      sizeBytes: 1024,
      width: 1080,
      height: 1080,
      durationSeconds: 30,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Video must be vertical."],
    });
  });

  test("rejects videos longer than 180 seconds", () => {
    const result = validateShortFormVideo({
      contentType: "video/mp4",
      sizeBytes: 1024,
      width: 1080,
      height: 1920,
      durationSeconds: MAX_SHORT_FORM_DURATION_SECONDS + 0.1,
    });

    expect(result).toEqual({
      ok: false,
      errors: ["Video must be 180 seconds or shorter."],
    });
  });
});

describe("upload object keys", () => {
  test("sanitizes file names and creates a unique scoped key", async () => {
    const { createUploadObjectKey } = await import("../../src/lib/storage");

    const key = createUploadObjectKey({
      userId: "user_123",
      fileName: "../../My Launch Video!!!.MP4",
      contentType: "video/mp4",
      now: new Date("2026-05-12T15:30:00.000Z"),
      randomUUID: () => "uuid-123",
    });

    expect(key).toBe("uploads/user_123/2026/05/12/uuid-123-my-launch-video.mp4");
  });

  test("uses the trusted content type extension over a misleading file extension", async () => {
    const { createUploadObjectKey } = await import("../../src/lib/storage");

    const key = createUploadObjectKey({
      userId: "user_123",
      fileName: "clip.mov",
      contentType: "video/mp4",
      now: new Date("2026-05-12T15:30:00.000Z"),
      randomUUID: () => "uuid-123",
    });

    expect(key).toBe("uploads/user_123/2026/05/12/uuid-123-clip.mp4");
  });

  test("signs the required content-type header for direct uploads", async () => {
    vi.stubEnv("S3_ENDPOINT", "https://storage.example.com");
    vi.stubEnv("S3_REGION", "us-east-1");
    vi.stubEnv("S3_BUCKET", "video-scheduler-uploads");
    vi.stubEnv("S3_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret-key");
    const { createSignedUploadUrl } = await import("../../src/lib/storage");

    const signedUpload = await createSignedUploadUrl({
      key: "uploads/user_123/2026/05/12/uuid-123-video.mp4",
      contentType: "video/mp4",
      sizeBytes: 1024,
      expiresInSeconds: 60,
    });
    const url = new URL(signedUpload.url);

    expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toContain(
      "content-type",
    );
    expect(signedUpload.headers).toEqual({ "Content-Type": "video/mp4" });
  });

  test("does not require storage secrets when the module is imported", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("DATABASE_URL", "postgresql://user:password@localhost:5432/video_scheduler");
    vi.stubEnv("NEXTAUTH_URL", "https://app.example.com");
    vi.stubEnv("NEXTAUTH_SECRET", "replace-with-a-random-secret");
    vi.stubEnv("S3_ENDPOINT", "");
    vi.stubEnv("S3_BUCKET", "");
    vi.stubEnv("S3_ACCESS_KEY_ID", "");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "");

    await expect(import("../../src/lib/storage")).resolves.toBeDefined();
  });
});
