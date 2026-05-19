import { Platform } from "@/lib/domain";

export type ConnectionHealthStatus =
  | "connected"
  | "expires-soon"
  | "expired"
  | "missing-permissions"
  | "not-connected";

export type ConnectionHealthInput = {
  platform: string;
  accountName?: string;
  scopes?: string | null;
  expiresAt?: Date | number | null;
  hasRefreshToken?: boolean | null;
};

const requiredScopes: Record<string, string[]> = {
  [Platform.YOUTUBE]: [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
  ],
  [Platform.TIKTOK]: ["user.info.basic", "video.upload", "video.list"],
  [Platform.INSTAGRAM]: [
    "instagram_business_basic",
    "instagram_business_manage_messages",
    "instagram_business_content_publish",
  ],
};

const expiresSoonMs = 7 * 24 * 60 * 60 * 1000;

export function getConnectionHealth(
  account: ConnectionHealthInput | null | undefined,
  now = new Date(),
) {
  if (!account) {
    return {
      status: "not-connected" as const,
      label: "Not connected",
      message: "Connect this platform before scheduling posts to it.",
    };
  }

  const missingScopes = getMissingRequiredScopes(account.platform, account.scopes);

  if (missingScopes.length > 0) {
    return {
      status: "missing-permissions" as const,
      label: "Missing permissions",
      message: `Reconnect ${formatPlatformName(account.platform)} to grant: ${missingScopes.join(", ")}.`,
    };
  }

  const expiresAt = normalizeExpiresAt(account.expiresAt);

  if (account.hasRefreshToken) {
    return {
      status: "connected" as const,
      label: "Connected",
      message: `${account.accountName ?? formatPlatformName(account.platform)} is connected. Access refreshes automatically.`,
    };
  }

  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return {
      status: "expired" as const,
      label: "Expired",
      message: `Reconnect ${formatPlatformName(account.platform)}. The stored access token has expired.`,
    };
  }

  if (expiresAt && expiresAt.getTime() - now.getTime() <= expiresSoonMs) {
    return {
      status: "expires-soon" as const,
      label: "Expires soon",
      message: `Reconnect soon. Access expires ${expiresAt.toLocaleDateString("en")}.`,
    };
  }

  return {
    status: "connected" as const,
    label: "Connected",
    message: `${account.accountName ?? formatPlatformName(account.platform)} is connected.`,
  };
}

export function getMissingRequiredScopes(platform: string, scopes: string | null | undefined) {
  const granted = new Set(
    (scopes ?? "")
      .split(/[\s,]+/)
      .map((scope) => scope.trim())
      .filter(Boolean),
  );

  return (requiredScopes[platform] ?? []).filter((scope) => !granted.has(scope));
}

function normalizeExpiresAt(value: Date | number | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function formatPlatformName(platform: string) {
  const labels: Record<string, string> = {
    [Platform.YOUTUBE]: "YouTube",
    [Platform.TIKTOK]: "TikTok",
    [Platform.INSTAGRAM]: "Instagram",
  };

  return labels[platform] ?? platform;
}
