import { z } from "zod";

import { Platform, PublishStatus } from "@/lib/domain";
import {
  normalizeVideoContentType,
  validateShortFormVideo,
} from "@/lib/validation/video";
import {
  createUserWorkspaceUploadPrefix,
  createWorkspaceUploadPrefix,
} from "@/lib/storage";

export const MAX_BASE_CAPTION_LENGTH = 2_200;
export const MAX_YOUTUBE_TITLE_LENGTH = 100;
export const MAX_HASHTAGS_LENGTH = 500;

const supportedPlatforms = [Platform.YOUTUBE, Platform.TIKTOK, Platform.INSTAGRAM] as const;

const createScheduledPostPayloadSchema = z
  .object({
    baseCaption: z.string().trim().optional(),
    youtubeTitle: z.string().trim().optional(),
    hashtags: z.string().trim().optional(),
    scheduledAt: z.string().trim().optional(),
    timezone: z.string().trim().max(100).optional(),
    platforms: z.array(z.string()).optional(),
    accountIdsByPlatform: z
      .object({
        YOUTUBE: z.array(z.string().trim().min(1)).optional(),
        TIKTOK: z.array(z.string().trim().min(1)).optional(),
        INSTAGRAM: z.array(z.string().trim().min(1)).optional(),
      })
      .optional(),
    video: z
      .object({
        storageKey: z.string().trim().min(1).max(1_024),
        fileName: z.string().trim().min(1).max(255),
        mimeType: z.string().trim().min(1).max(100),
        sizeBytes: z.number().int().positive(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        duration: z.number().positive().optional(),
        durationSeconds: z.number().positive().optional(),
      })
      .optional(),
  })
  .strict();

export type CreateScheduledPostInput = {
  baseCaption: string;
  youtubeTitle?: string;
  hashtags: string;
  scheduledAt: Date;
  timezone: string;
  platforms: Platform[];
  accountIdsByPlatform: Partial<Record<Platform, string[]>>;
  video: {
    storageKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
  };
};

export type ParseCreateScheduledPostOptions = {
  workspaceId: string;
  userId: string;
  now?: Date;
};

export type CreateScheduledPostParseResult =
  | { success: true; data: CreateScheduledPostInput }
  | { success: false; errors: string[] };

export function parseCreateScheduledPostInput(
  payload: unknown,
  options: ParseCreateScheduledPostOptions,
): CreateScheduledPostParseResult {
  const parsed = createScheduledPostPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    return { success: false, errors: formatPayloadIssues(parsed.error) };
  }

  const errors: string[] = [];
  const data = parsed.data;
  const baseCaption = data.baseCaption?.trim() ?? "";
  const youtubeTitle = data.youtubeTitle?.trim() ?? "";
  const hashtags = normalizeHashtags(data.hashtags?.trim() ?? "");
  const captionWithHashtags = appendHashtags(baseCaption, hashtags);
  const timezone = data.timezone?.trim() ?? "";
  const scheduledAt = parseScheduledAt(data.scheduledAt);
  const platforms = normalizePlatforms(data.platforms, errors);
  const accountIdsByPlatform = normalizeAccountSelections(data.accountIdsByPlatform);

  if (!baseCaption) {
    errors.push("Caption is required.");
  } else if (baseCaption.length > MAX_BASE_CAPTION_LENGTH) {
    errors.push(`Caption must be ${MAX_BASE_CAPTION_LENGTH} characters or fewer.`);
  }

  if (youtubeTitle.length > MAX_YOUTUBE_TITLE_LENGTH) {
    errors.push(`YouTube title must be ${MAX_YOUTUBE_TITLE_LENGTH} characters or fewer.`);
  }

  if (hashtags.length > MAX_HASHTAGS_LENGTH) {
    errors.push(`Hashtags must be ${MAX_HASHTAGS_LENGTH} characters or fewer.`);
  }

  if (captionWithHashtags.length > MAX_BASE_CAPTION_LENGTH) {
    errors.push(`Caption and hashtags must be ${MAX_BASE_CAPTION_LENGTH} characters or fewer.`);
  }

  if (!data.scheduledAt || !scheduledAt) {
    errors.push("Schedule time must be a valid datetime.");
  } else if (scheduledAt <= (options.now ?? new Date())) {
    errors.push("Schedule time must be in the future.");
  }

  if (!timezone) {
    errors.push("Timezone is required.");
  } else if (!isValidTimeZone(timezone)) {
    errors.push("Timezone must be a valid IANA timezone.");
  }

  if (!data.video) {
    errors.push("Video details are required.");
  } else {
    const durationSeconds = getVideoDurationSeconds(data.video);
    if (!storageKeyBelongsToWorkspace(data.video.storageKey, options.workspaceId)) {
      errors.push("Video upload does not belong to this workspace.");
    } else if (
      !storageKeyBelongsToUserWorkspace(data.video.storageKey, {
        workspaceId: options.workspaceId,
        userId: options.userId,
      })
    ) {
      errors.push("Video upload does not belong to this user.");
    }

    if (!isPositiveNumber(data.video.width) || !isPositiveNumber(data.video.height)) {
      errors.push("Video width and height are required.");
    }

    if (!isPositiveNumber(durationSeconds)) {
      errors.push("Video duration is required.");
    }

    const videoValidation = validateShortFormVideo({
      contentType: data.video.mimeType,
      sizeBytes: data.video.sizeBytes,
      width: data.video.width,
      height: data.video.height,
      durationSeconds,
    });

    if (!videoValidation.ok) {
      errors.push(...videoValidation.errors);
    }
  }

  if (errors.length > 0 || !scheduledAt || !data.video) {
    return { success: false, errors: uniqueMessages(errors) };
  }

  return {
    success: true,
    data: {
      baseCaption,
      youtubeTitle: youtubeTitle || undefined,
      hashtags,
      scheduledAt,
      timezone,
      platforms,
      accountIdsByPlatform,
      video: {
        storageKey: data.video.storageKey,
        fileName: data.video.fileName,
        mimeType: normalizeVideoContentType(data.video.mimeType),
        sizeBytes: data.video.sizeBytes,
        width: data.video.width,
        height: data.video.height,
        durationSeconds: getVideoDurationSeconds(data.video),
      },
    },
  };
}

export function buildPlatformPostCreateInputs(input: CreateScheduledPostInput) {
  const caption = appendHashtags(input.baseCaption, input.hashtags);

  return input.platforms.map((platform) => ({
    platform,
    ...(platform === Platform.YOUTUBE && input.youtubeTitle ? { title: input.youtubeTitle } : {}),
    caption,
    scheduledAt: input.scheduledAt,
    status:
      platform === Platform.YOUTUBE
        ? PublishStatus.SCHEDULED
        : PublishStatus.APPROVAL_PENDING,
  }));
}

function normalizeHashtags(value: string) {
  if (!value) {
    return "";
  }

  return value
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");
}

function appendHashtags(caption: string, hashtags: string) {
  if (!hashtags) {
    return caption;
  }

  return `${caption.trim()}\n\n${hashtags}`.trim();
}

function parseScheduledAt(value: string | undefined) {
  if (!value || !value.includes("T")) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePlatforms(value: string[] | undefined, errors: string[]) {
  if (!value || value.length === 0) {
    errors.push("Select at least one platform.");
    return [];
  }

  const unsupported = value.some((platform) => !isSupportedPlatform(platform));
  if (unsupported) {
    errors.push("Unsupported platform selected.");
  }

  const uniquePlatforms = value.filter(isSupportedPlatform).filter((platform, index, all) => {
    return all.indexOf(platform) === index;
  });

  if (uniquePlatforms.length !== value.filter(isSupportedPlatform).length) {
    errors.push("Select each platform only once.");
  }

  return uniquePlatforms;
}

function normalizeAccountSelections(
  value:
    | {
        YOUTUBE?: string[];
        TIKTOK?: string[];
        INSTAGRAM?: string[];
      }
    | undefined,
) {
  const selections: Partial<Record<Platform, string[]>> = {};

  for (const platform of supportedPlatforms) {
    const ids = value?.[platform]
      ?.map((id) => id.trim())
      .filter(Boolean);

    if (ids?.length) {
      selections[platform] = Array.from(new Set(ids));
    }
  }

  return selections;
}

function isSupportedPlatform(platform: string): platform is Platform {
  return supportedPlatforms.includes(platform as Platform);
}

function getVideoDurationSeconds(video: {
  duration?: number;
  durationSeconds?: number;
}) {
  return video.duration ?? video.durationSeconds;
}

export function storageKeyBelongsToWorkspace(storageKey: string, workspaceId: string) {
  return storageKey.startsWith(createWorkspaceUploadPrefix(workspaceId));
}

export function storageKeyBelongsToUserWorkspace(
  storageKey: string,
  owner: { workspaceId: string; userId: string },
) {
  return storageKey.startsWith(createUserWorkspaceUploadPrefix(owner));
}

export function isValidTimeZone(timezone: string) {
  try {
    Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isPositiveNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatPayloadIssues(error: z.ZodError) {
  const messages = new Set<string>();

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (field === "video") {
      messages.add("Video details are required.");
    } else if (field === "platforms") {
      messages.add("Select at least one platform.");
    } else {
      messages.add("Invalid post request.");
    }
  }

  return Array.from(messages);
}

function uniqueMessages(messages: string[]) {
  return Array.from(new Set(messages));
}
