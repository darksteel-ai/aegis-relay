import { Platform } from "@/lib/domain";

import {
  PlatformApprovalPendingError,
  type PlatformAdapter,
} from "@/lib/platforms/types";

export function createTikTokAdapter(): PlatformAdapter {
  return {
    async publish() {
      throw new PlatformApprovalPendingError(
        Platform.TIKTOK,
        "TikTok publishing is pending platform approval.",
      );
    },
  };
}

export const tiktokAdapter = createTikTokAdapter();
