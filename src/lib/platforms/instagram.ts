import { Platform } from "@prisma/client";

import {
  PlatformApprovalPendingError,
  type PlatformAdapter,
} from "@/lib/platforms/types";

export function createInstagramAdapter(): PlatformAdapter {
  return {
    async publish() {
      throw new PlatformApprovalPendingError(
        Platform.INSTAGRAM,
        "Instagram publishing is pending platform approval.",
      );
    },
  };
}

export const instagramAdapter = createInstagramAdapter();
