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
export const MAX_TIKTOK_TITLE_LENGTH = 2_200;

const supportedPlatforms = [
  Platform.YOUTUBE,
  Platform.TIKTOK,
  Platform.INSTAGRAM,
  Platform.FACEBOOK,
  Platform.LINKEDIN,
] as const;
const tiktokPrivacyLevels = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
] as const;

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
        FACEBOOK: z.array(z.string().trim().min(1)).optional(),
        LINKEDIN: z.array(z.string().trim().min(1)).optional(),
      })
      .optional(),
    platformCaptions: z
      .object({
        YOUTUBE: z.string().trim().max(MAX_BASE_CAPTION_LENGTH).optional(),
        TIKTOK: z.string().trim().max(MAX_BASE_CAPTION_LENGTH).optional(),
        INSTAGRAM: z.string().trim().max(MAX_BASE_CAPTION_LENGTH).optional(),
        FACEBOOK: z.string().trim().max(MAX_BASE_CAPTION_LENGTH).optional(),
        LINKEDIN: z.string().trim().max(MAX_BASE_CAPTION_LENGTH).optional(),
      })
      .optional(),
    workflowStatus: z
      .union([z.literal("DRAFT"), z.literal("NEEDS_REVIEW"), z.literal("APPROVED")])
      .optional(),
    tiktokSettings: z
      .object({
        title: z.string().trim().max(MAX_TIKTOK_TITLE_LENGTH).optional(),
        privacyLevel: z.string().trim().optional(),
        allowComments: z.boolean().optional(),
        allowDuet: z.boolean().optional(),
        allowStitch: z.boolean().optional(),
        brandContent: z.boolean().optional(),
        brandOrganic: z.boolean().optional(),
        musicUsageConfirmed: z.boolean().optional(),
      })
      .optional(),
    video: z
      .object({
        existingVideoId: z.string().trim().min(1).optional(),
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
  platformCaptions: Partial<Record<Platform, string>>;
  workflowStatus: "DRAFT" | "NEEDS_REVIEW" | "APPROVED";
  tiktokSettings?: {
    title?: string;
    privacyLevel: string;
    allowComments: boolean;
    allowDuet: boolean;
    allowStitch: boolean;
    brandContent: boolean;
    brandOrganic: boolean;
    musicUsageConfirmed: boolean;
  };
  video: {
    existingVideoId?: string;
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
  const platformCaptions = normalizePlatformCaptions(data.platformCaptions);
  const workflowStatus = data.workflowStatus ?? "APPROVED";
  const tiktokSettings = normalizeTikTokSettings(data.tiktokSettings);

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

  if (platforms.includes(Platform.TIKTOK)) {
    if (!tiktokSettings) {
      errors.push("TikTok publishing settings are required.");
    } else {
      if (!tiktokPrivacyLevels.includes(tiktokSettings.privacyLevel as (typeof tiktokPrivacyLevels)[number])) {
        errors.push("Choose a TikTok privacy option before scheduling.");
      }

      if (!tiktokSettings.musicUsageConfirmed) {
        errors.push("Confirm TikTok music usage rights before scheduling.");
      }
    }
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
      platformCaptions,
      workflowStatus,
      tiktokSettings: platforms.includes(Platform.TIKTOK) ? tiktokSettings : undefined,
      video: {
        existingVideoId: data.video.existingVideoId,
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
  const status =
    input.workflowStatus === "APPROVED" ? PublishStatus.SCHEDULED : PublishStatus.DRAFT;

  return input.platforms.map((platform) => ({
    platform,
    ...(platform === Platform.YOUTUBE && input.youtubeTitle ? { title: input.youtubeTitle } : {}),
    ...(platform === Platform.TIKTOK && input.tiktokSettings?.title
      ? { title: input.tiktokSettings.title }
      : {}),
    caption: appendHashtags(input.platformCaptions[platform] || input.baseCaption, input.hashtags),
    privacy:
      platform === Platform.TIKTOK && input.tiktokSettings?.privacyLevel
        ? input.tiktokSettings.privacyLevel
        : "public",
    ...(platform === Platform.TIKTOK && input.tiktokSettings
      ? {
          allowComments: input.tiktokSettings.allowComments,
          allowDuet: input.tiktokSettings.allowDuet,
          allowStitch: input.tiktokSettings.allowStitch,
          brandContent: input.tiktokSettings.brandContent,
          brandOrganic: input.tiktokSettings.brandOrganic,
        }
      : {}),
    scheduledAt: input.scheduledAt,
    status,
  }));
}

function normalizePlatformCaptions(
  value:
    | {
        YOUTUBE?: string;
        TIKTOK?: string;
        INSTAGRAM?: string;
        FACEBOOK?: string;
        LINKEDIN?: string;
      }
    | undefined,
) {
  const captions: Partial<Record<Platform, string>> = {};

  for (const platform of supportedPlatforms) {
    const caption = value?.[platform]?.trim();

    if (caption) {
      captions[platform] = caption;
    }
  }

  return captions;
}

function normalizeTikTokSettings(
  value:
    | {
        title?: string;
        privacyLevel?: string;
        allowComments?: boolean;
        allowDuet?: boolean;
        allowStitch?: boolean;
        brandContent?: boolean;
        brandOrganic?: boolean;
        musicUsageConfirmed?: boolean;
      }
    | undefined,
) {
  if (!value) {
    return undefined;
  }

  return {
    title: value.title?.trim() || undefined,
    privacyLevel: value.privacyLevel?.trim() ?? "",
    allowComments: value.allowComments === true,
    allowDuet: value.allowDuet === true,
    allowStitch: value.allowStitch === true,
    brandContent: value.brandContent === true,
    brandOrganic: value.brandOrganic === true,
    musicUsageConfirmed: value.musicUsageConfirmed === true,
  };
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
        FACEBOOK?: string[];
        LINKEDIN?: string[];
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
