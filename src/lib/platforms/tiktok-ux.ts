export const TIKTOK_MUSIC_USAGE_CONSENT =
  "By posting, you agree to TikTok's Music Usage Confirmation";
export const TIKTOK_BRANDED_CONTENT_CONSENT =
  "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation";
export const TIKTOK_COMMERCIAL_SELECTION_HINT =
  "You need to indicate if your content promotes yourself, a third party, or both.";
export const TIKTOK_BRANDED_PRIVATE_HINT =
  "Branded content visibility cannot be set to private.";
export const TIKTOK_YOUR_BRAND_LABEL = "Your photo/video will be labeled as 'Promotional content'";
export const TIKTOK_PAID_PARTNERSHIP_LABEL =
  "Your photo/video will be labeled as 'Paid partnership'";
export const TIKTOK_PROCESSING_NOTICE =
  "After you finish publishing, it may take a few minutes for the content to process and be visible on your TikTok profile.";

export const tiktokCreatorCannotPostCodes = [
  "spam_risk_too_many_posts",
  "spam_risk_user_banned_from_posting",
  "reached_active_user_cap",
] as const;

export type TikTokCreatorCannotPostCode = (typeof tiktokCreatorCannotPostCodes)[number];

export function isTikTokCreatorBlockedFromPosting(code: string | undefined) {
  return tiktokCreatorCannotPostCodes.includes(code as TikTokCreatorCannotPostCode);
}

export function getTikTokCreatorBlockMessage(code: string | undefined) {
  if (code === "spam_risk_too_many_posts") {
    return "This TikTok account cannot make more posts right now. Try again later.";
  }

  if (code === "spam_risk_user_banned_from_posting") {
    return "This TikTok account is currently banned from posting. Try again later.";
  }

  if (code === "reached_active_user_cap") {
    return "Relaygator has reached TikTok's daily active-creator cap. Try again later.";
  }

  return "This TikTok account cannot post right now. Try again later.";
}

export function getTikTokConsentText(brandContent: boolean) {
  return brandContent ? TIKTOK_BRANDED_CONTENT_CONSENT : TIKTOK_MUSIC_USAGE_CONSENT;
}

export function getTikTokCommercialLabel({
  brandOrganic,
  brandContent,
}: {
  brandOrganic: boolean;
  brandContent: boolean;
}) {
  if (brandContent) {
    return TIKTOK_PAID_PARTNERSHIP_LABEL;
  }

  if (brandOrganic) {
    return TIKTOK_YOUR_BRAND_LABEL;
  }

  return "";
}

export function getTikTokPrivacyOptions(privacyLevelOptions: string[] | undefined) {
  return privacyLevelOptions?.filter(Boolean) ?? [];
}

export function formatTikTokPrivacy(option: string) {
  const labels: Record<string, string> = {
    SELF_ONLY: "Only me",
    MUTUAL_FOLLOW_FRIENDS: "Friends",
    FOLLOWER_OF_CREATOR: "Followers",
    PUBLIC_TO_EVERYONE: "Everyone",
  };

  return labels[option] ?? option;
}

export function getTikTokComposerBlockReason({
  creatorInfoLoaded,
  creatorInfoError,
  canPost,
  cannotPostMessage,
  privacyLevel,
  privacyLevelOptions,
  commercialContentEnabled,
  brandContent,
  brandOrganic,
  musicUsageConfirmed,
  videoDurationSeconds,
  maxVideoPostDurationSec,
}: {
  creatorInfoLoaded: boolean;
  creatorInfoError?: string;
  canPost: boolean;
  cannotPostMessage?: string;
  privacyLevel: string;
  privacyLevelOptions: string[];
  commercialContentEnabled: boolean;
  brandContent: boolean;
  brandOrganic: boolean;
  musicUsageConfirmed: boolean;
  videoDurationSeconds?: number | null;
  maxVideoPostDurationSec?: number | null;
}) {
  if (creatorInfoError) {
    return creatorInfoError;
  }

  if (!creatorInfoLoaded) {
    return "Load TikTok creator settings before posting.";
  }

  if (!canPost) {
    return cannotPostMessage ?? getTikTokCreatorBlockMessage(undefined);
  }

  if (
    typeof maxVideoPostDurationSec === "number" &&
    typeof videoDurationSeconds === "number" &&
    videoDurationSeconds > maxVideoPostDurationSec
  ) {
    return `This video is longer than the ${maxVideoPostDurationSec}-second limit TikTok returned for this account.`;
  }

  if (!privacyLevel) {
    return "Choose TikTok privacy before scheduling.";
  }

  if (privacyLevelOptions.length && !privacyLevelOptions.includes(privacyLevel)) {
    return "Choose a TikTok privacy option from the current account settings.";
  }

  if (commercialContentEnabled && !brandContent && !brandOrganic) {
    return TIKTOK_COMMERCIAL_SELECTION_HINT;
  }

  if (privacyLevel === "SELF_ONLY" && brandContent) {
    return TIKTOK_BRANDED_PRIVATE_HINT;
  }

  if (!musicUsageConfirmed) {
    return "Confirm TikTok music usage rights before scheduling.";
  }

  return "";
}
