import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import {
  UPLOAD_URL_TTL_SECONDS,
  createSignedUploadUrl,
  createUploadObjectKey,
} from "@/lib/storage";
import {
  isSupportedShortFormVideoType,
  normalizeVideoContentType,
  validateShortFormVideo,
  type SupportedShortFormVideoType,
} from "@/lib/validation/video";

export const runtime = "nodejs";

const presignRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(100),
  sizeBytes: z.number().int().positive(),
});

const contentTypeByExtension: Record<string, SupportedShortFormVideoType> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
};

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getConvexClient();
  const workspace = await client.query(convexApi.workspaces.getForUser, {
    userId: session.user.id,
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = presignRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  }

  const contentType = normalizeVideoContentType(parsed.data.contentType);

  if (!isSupportedShortFormVideoType(contentType)) {
    return NextResponse.json({ error: "Upload an MP4 or MOV video." }, { status: 400 });
  }

  if (!fileNameMatchesContentType(parsed.data.fileName, contentType)) {
    return NextResponse.json(
      { error: "File extension does not match the video type." },
      { status: 400 },
    );
  }

  const validation = validateShortFormVideo({
    contentType,
    sizeBytes: parsed.data.sizeBytes,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  const key = createUploadObjectKey({
    userId: session.user.id,
    workspaceId: workspace.id,
    fileName: parsed.data.fileName,
    contentType,
  });
  const signedUpload = await createSignedUploadUrl({
    key,
    contentType,
    sizeBytes: parsed.data.sizeBytes,
  });
  const expiresAt = new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000);

  await client.mutation(convexApi.uploads.createReservation, {
    workspaceId: workspace.id,
    userId: session.user.id,
    storageKey: key,
    fileName: parsed.data.fileName,
    mimeType: contentType,
    sizeBytes: parsed.data.sizeBytes,
    expiresAt: expiresAt.getTime(),
  });

  return NextResponse.json({
    key,
    uploadUrl: signedUpload.url,
    method: signedUpload.method,
    headers: signedUpload.headers,
  });
}

function fileNameMatchesContentType(fileName: string, contentType: SupportedShortFormVideoType) {
  const extension = fileName.split(/[\\/]/).pop()?.split(".").pop()?.toLowerCase();

  if (!extension) {
    return false;
  }

  return contentTypeByExtension[extension] === contentType;
}
