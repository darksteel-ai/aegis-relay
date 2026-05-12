import { randomUUID } from "node:crypto";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getStorageEnv } from "@/lib/env";
import {
  normalizeVideoContentType,
  type SupportedShortFormVideoType,
} from "@/lib/validation/video";

const UPLOAD_URL_TTL_SECONDS = 15 * 60;

const EXTENSIONS_BY_CONTENT_TYPE: Record<SupportedShortFormVideoType, "mp4" | "mov"> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

let storageClient: S3Client | null = null;

export type CreateUploadObjectKeyInput = {
  userId: string;
  fileName: string;
  contentType: SupportedShortFormVideoType;
  now?: Date;
  randomUUID?: () => string;
};

export type CreateSignedUploadUrlInput = {
  key: string;
  contentType: SupportedShortFormVideoType;
  sizeBytes?: number;
  expiresInSeconds?: number;
};

export function createUploadObjectKey({
  userId,
  fileName,
  contentType,
  now = new Date(),
  randomUUID: createId = randomUUID,
}: CreateUploadObjectKeyInput) {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const safeUserId = sanitizeKeySegment(userId) || "unknown-user";
  const baseName = sanitizeFileBaseName(fileName);
  const extension = EXTENSIONS_BY_CONTENT_TYPE[contentType];

  return `uploads/${safeUserId}/${year}/${month}/${day}/${createId()}-${baseName}.${extension}`;
}

export async function createSignedUploadUrl({
  key,
  contentType,
  sizeBytes,
  expiresInSeconds = UPLOAD_URL_TTL_SECONDS,
}: CreateSignedUploadUrlInput) {
  const storageEnv = getStorageEnv();
  const command = new PutObjectCommand({
    Bucket: storageEnv.S3_BUCKET,
    Key: key,
    ContentType: normalizeVideoContentType(contentType),
    ContentLength: sizeBytes,
  });
  const url = await getSignedUrl(getStorageClient(), command, {
    expiresIn: expiresInSeconds,
  });

  return {
    key,
    url,
    method: "PUT" as const,
    headers: {
      "Content-Type": normalizeVideoContentType(contentType),
    },
  };
}

export async function getObjectReadStream(key: string) {
  const storageEnv = getStorageEnv();
  const response = await getStorageClient().send(
    new GetObjectCommand({
      Bucket: storageEnv.S3_BUCKET,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error("Storage object did not return a readable body.");
  }

  if ("pipe" in response.Body && typeof response.Body.pipe === "function") {
    return response.Body as NodeJS.ReadableStream;
  }

  throw new Error("Storage object body is not a Node.js readable stream.");
}

function getStorageClient() {
  if (!storageClient) {
    const storageEnv = getStorageEnv();
    storageClient = new S3Client({
      endpoint: storageEnv.S3_ENDPOINT,
      region: storageEnv.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: storageEnv.S3_ACCESS_KEY_ID,
        secretAccessKey: storageEnv.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  return storageClient;
}

function sanitizeFileBaseName(fileName: string) {
  const lastPathSegment = fileName.split(/[\\/]/).pop() ?? "video";
  const withoutExtension = lastPathSegment.replace(/\.[^.]+$/, "");
  const sanitized = sanitizeKeySegment(withoutExtension);

  return sanitized || "video";
}

function sanitizeKeySegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}
