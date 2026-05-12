import type { Platform } from "@prisma/client";

export type PlatformPublishInput = {
  connectedAccount: {
    id?: string;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: Date | null;
  };
  platformPost: {
    title?: string | null;
    caption: string;
    privacy?: string | null;
  };
  video: {
    storageKey: string;
    mimeType: string;
  };
};

export type PlatformPublishResult = {
  platformPostId: string;
  url?: string;
};

export type PublishInput = PlatformPublishInput;
export type PublishResult = PlatformPublishResult;

export interface PlatformAdapter {
  publish(input: PlatformPublishInput): Promise<PlatformPublishResult>;
}

export class PlatformApprovalPendingError extends Error {
  readonly code = "APPROVAL_PENDING";

  constructor(
    readonly platform: Platform,
    message: string,
  ) {
    super(message);
    this.name = "PlatformApprovalPendingError";
  }
}
