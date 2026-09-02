import { describe, expect, test } from "vitest";

import {
  TIKTOK_BRANDED_CONTENT_CONSENT,
  TIKTOK_BRANDED_PRIVATE_HINT,
  TIKTOK_COMMERCIAL_SELECTION_HINT,
  TIKTOK_MUSIC_USAGE_CONSENT,
  TIKTOK_PAID_PARTNERSHIP_LABEL,
  TIKTOK_YOUR_BRAND_LABEL,
  getTikTokCommercialLabel,
  getTikTokComposerBlockReason,
  getTikTokConsentText,
  getTikTokCreatorBlockMessage,
  getTikTokPrivacyOptions,
  isTikTokCreatorBlockedFromPosting,
} from "@/lib/platforms/tiktok-ux";

const readyComposer = {
  creatorInfoLoaded: true,
  canPost: true,
  privacyLevel: "SELF_ONLY",
  privacyLevelOptions: ["SELF_ONLY", "PUBLIC_TO_EVERYONE"],
  commercialContentEnabled: false,
  brandContent: false,
  brandOrganic: false,
  musicUsageConfirmed: true,
  videoDurationSeconds: 30,
  maxVideoPostDurationSec: 60,
};

describe("TikTok composer UX guidelines", () => {
  test("uses TikTok's exact consent strings", () => {
    expect(getTikTokConsentText(false)).toBe(TIKTOK_MUSIC_USAGE_CONSENT);
    expect(getTikTokConsentText(true)).toBe(TIKTOK_BRANDED_CONTENT_CONSENT);
    expect(TIKTOK_MUSIC_USAGE_CONSENT).toBe(
      "By posting, you agree to TikTok's Music Usage Confirmation",
    );
    expect(TIKTOK_BRANDED_CONTENT_CONSENT).toBe(
      "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation",
    );
  });

  test("labels commercial disclosure with TikTok's required copy", () => {
    expect(getTikTokCommercialLabel({ brandOrganic: true, brandContent: false })).toBe(
      TIKTOK_YOUR_BRAND_LABEL,
    );
    expect(getTikTokCommercialLabel({ brandOrganic: false, brandContent: true })).toBe(
      TIKTOK_PAID_PARTNERSHIP_LABEL,
    );
    expect(getTikTokCommercialLabel({ brandOrganic: true, brandContent: true })).toBe(
      TIKTOK_PAID_PARTNERSHIP_LABEL,
    );
  });

  test("lists only privacy_level_options from creator_info", () => {
    expect(getTikTokPrivacyOptions(["SELF_ONLY", "MUTUAL_FOLLOW_FRIENDS"])).toEqual([
      "SELF_ONLY",
      "MUTUAL_FOLLOW_FRIENDS",
    ]);
    expect(getTikTokPrivacyOptions(undefined)).toEqual([]);
  });

  test("stops posting when creator_info says the account cannot post", () => {
    expect(isTikTokCreatorBlockedFromPosting("spam_risk_too_many_posts")).toBe(true);
    expect(
      getTikTokComposerBlockReason({
        ...readyComposer,
        canPost: false,
        cannotPostMessage: getTikTokCreatorBlockMessage("spam_risk_too_many_posts"),
      }),
    ).toBe("This TikTok account cannot make more posts right now. Try again later.");
  });

  test("enforces max_video_post_duration_sec", () => {
    expect(
      getTikTokComposerBlockReason({
        ...readyComposer,
        videoDurationSeconds: 90,
        maxVideoPostDurationSec: 60,
      }),
    ).toBe("This video is longer than the 60-second limit TikTok returned for this account.");
  });

  test("requires a manual privacy choice and commercial disclosure details", () => {
    expect(
      getTikTokComposerBlockReason({
        ...readyComposer,
        privacyLevel: "",
      }),
    ).toBe("Choose TikTok privacy before scheduling.");
    expect(
      getTikTokComposerBlockReason({
        ...readyComposer,
        commercialContentEnabled: true,
        brandContent: false,
        brandOrganic: false,
      }),
    ).toBe(TIKTOK_COMMERCIAL_SELECTION_HINT);
    expect(
      getTikTokComposerBlockReason({
        ...readyComposer,
        brandContent: true,
        privacyLevel: "SELF_ONLY",
      }),
    ).toBe(TIKTOK_BRANDED_PRIVATE_HINT);
  });
});
