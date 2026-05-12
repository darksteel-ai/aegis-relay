export const MAX_SHORT_FORM_FILE_SIZE_BYTES = 500 * 1024 * 1024;
export const MAX_SHORT_FORM_DURATION_SECONDS = 180;

export const SUPPORTED_SHORT_FORM_VIDEO_TYPES = ["video/mp4", "video/quicktime"] as const;

export type SupportedShortFormVideoType = (typeof SUPPORTED_SHORT_FORM_VIDEO_TYPES)[number];

export type ShortFormVideoInput = {
  contentType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
};

export type ShortFormVideoValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateShortFormVideo(
  input: ShortFormVideoInput,
): ShortFormVideoValidationResult {
  const errors: string[] = [];
  const contentType = normalizeVideoContentType(input.contentType);

  if (!isSupportedShortFormVideoType(contentType)) {
    errors.push("Upload an MP4 or MOV video.");
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    errors.push("Video file size is required.");
  } else if (input.sizeBytes > MAX_SHORT_FORM_FILE_SIZE_BYTES) {
    errors.push("Video must be 500MB or smaller.");
  }

  const width = input.width;
  const height = input.height;
  const hasKnownDimensions = isPositiveNumber(width) && isPositiveNumber(height);

  if (hasKnownDimensions && height <= width) {
    errors.push("Video must be vertical.");
  }

  if (
    input.durationSeconds != null &&
    Number.isFinite(input.durationSeconds) &&
    input.durationSeconds > MAX_SHORT_FORM_DURATION_SECONDS
  ) {
    errors.push("Video must be 180 seconds or shorter.");
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function normalizeVideoContentType(contentType: string) {
  return contentType.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function isSupportedShortFormVideoType(
  contentType: string,
): contentType is SupportedShortFormVideoType {
  return SUPPORTED_SHORT_FORM_VIDEO_TYPES.includes(
    normalizeVideoContentType(contentType) as SupportedShortFormVideoType,
  );
}

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
