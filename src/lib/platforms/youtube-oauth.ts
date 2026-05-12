import { ZodError } from "zod";

import { getGoogleEnv } from "@/lib/env";

type EnvSource = Record<string, string | undefined>;

type YouTubeOAuthStartUrlResult =
  | {
      success: true;
      url: string;
    }
  | {
      success: false;
      reason: "config-error";
    };

const youtubeUploadScope = "https://www.googleapis.com/auth/youtube.upload";

export function buildYouTubeOAuthStartUrl(
  source: EnvSource = process.env,
): YouTubeOAuthStartUrlResult {
  let googleEnv;

  try {
    googleEnv = getGoogleEnv(source);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        reason: "config-error",
      };
    }

    throw error;
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", googleEnv.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", googleEnv.GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", youtubeUploadScope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");

  return {
    success: true,
    url: url.toString(),
  };
}
