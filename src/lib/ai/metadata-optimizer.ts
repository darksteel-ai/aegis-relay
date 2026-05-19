import { z } from "zod";

export type YouTubeRecentUpload = {
  title: string;
  url: string;
  publishedAt?: string;
  metrics?: PlatformMetrics;
};

export type PlatformMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

export type PlatformPerformanceItem = {
  title?: string;
  caption?: string;
  url?: string;
  publishedAt?: string;
  metrics?: PlatformMetrics;
};

export type PlatformDataSignal = {
  platform: "YouTube" | "TikTok" | "Instagram";
  accountName?: string;
  status: "available" | "limited" | "unavailable";
  recentItems: PlatformPerformanceItem[];
  notes: string[];
};

export type MetadataSuggestion = {
  title: string;
  hashtags: string[];
  rationale: string;
};

export type MetadataOptimizationResult = {
  suggestions: MetadataSuggestion[];
  basedOn: {
    channelName?: string;
    recentTitles: string[];
    platforms: PlatformDataSignal[];
  };
};

const openAiSuggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(100),
        hashtags: z.array(z.string().trim().min(1)).min(3).max(8),
        rationale: z.string().trim().min(1).max(240),
      }),
    )
    .min(1)
    .max(3),
});

export async function fetchYouTubeRecentUploads(channelId: string) {
  const url = new URL("https://www.youtube.com/feeds/videos.xml");
  url.searchParams.set("channel_id", channelId);

  const response = await fetch(url, {
    headers: { Accept: "application/atom+xml, application/xml;q=0.9, text/xml;q=0.8" },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error("Could not read recent YouTube uploads.");
  }

  return parseYouTubeUploadFeed(await response.text()).slice(0, 10);
}

export async function fetchYouTubePerformanceSignal({
  channelId,
  accountName,
  accessToken,
}: {
  channelId: string;
  accountName?: string;
  accessToken?: string;
}): Promise<PlatformDataSignal> {
  const uploads = await fetchYouTubeRecentUploads(channelId);

  if (!accessToken || uploads.length === 0) {
    return {
      platform: "YouTube",
      accountName,
      status: uploads.length ? "limited" : "unavailable",
      recentItems: uploads,
      notes: uploads.length
        ? ["Using recent public YouTube titles. Connect data access enables richer stats."]
        : ["No recent YouTube uploads were found."],
    };
  }

  const videoIds = uploads.map((upload) => readYouTubeVideoId(upload.url)).filter(Boolean);

  if (videoIds.length === 0) {
    return {
      platform: "YouTube",
      accountName,
      status: "limited",
      recentItems: uploads,
      notes: ["Using recent public YouTube titles. Video IDs were not available for stats lookup."],
    };
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("maxResults", "10");
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    return {
      platform: "YouTube",
      accountName,
      status: "limited",
      recentItems: uploads,
      notes: ["Using recent public YouTube titles. YouTube stats were not available."],
    };
  }

  const body = (await response.json()) as {
    items?: Array<{
      id?: string;
      snippet?: { title?: string; publishedAt?: string };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }>;
  };
  const enriched = (body.items ?? []).map((item) => ({
    title: item.snippet?.title,
    url: item.id ? `https://www.youtube.com/watch?v=${item.id}` : undefined,
    publishedAt: item.snippet?.publishedAt,
    metrics: {
      views: parseMetric(item.statistics?.viewCount),
      likes: parseMetric(item.statistics?.likeCount),
      comments: parseMetric(item.statistics?.commentCount),
    },
  }));

  return {
    platform: "YouTube",
    accountName,
    status: enriched.length ? "available" : "limited",
    recentItems: enriched.length ? enriched : uploads,
    notes: enriched.length
      ? ["Using recent YouTube titles and public engagement stats."]
      : ["Using recent public YouTube titles. No video stats were returned."],
  };
}

export async function fetchTikTokPerformanceSignal({
  accountName,
  accessToken,
  scopes,
}: {
  accountName?: string;
  accessToken?: string;
  scopes?: string;
}): Promise<PlatformDataSignal> {
  if (!accessToken) {
    return unavailablePlatform("TikTok", accountName, "TikTok is not connected yet.");
  }

  if (!hasScope(scopes, "video.list")) {
    return {
      platform: "TikTok",
      accountName,
      status: "limited",
      recentItems: [],
      notes: ["Reconnect TikTok after video.list is approved to use recent TikTok video data."],
    };
  }

  const response = await fetch(
    "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,view_count,like_count,comment_count,share_count",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ max_count: 10 }),
      next: { revalidate: 900 },
    },
  );

  if (!response.ok) {
    return unavailablePlatform("TikTok", accountName, "TikTok video data was not available.");
  }

  const body = (await response.json()) as {
    data?: {
      videos?: Array<{
        title?: string;
        video_description?: string;
        create_time?: number;
        share_url?: string;
        view_count?: number;
        like_count?: number;
        comment_count?: number;
        share_count?: number;
      }>;
    };
  };

  return {
    platform: "TikTok",
    accountName,
    status: "available",
    recentItems: (body.data?.videos ?? []).map((video) => ({
      title: video.title,
      caption: video.video_description,
      url: video.share_url,
      publishedAt: video.create_time
        ? new Date(video.create_time * 1000).toISOString()
        : undefined,
      metrics: {
        views: video.view_count,
        likes: video.like_count,
        comments: video.comment_count,
        shares: video.share_count,
      },
    })),
    notes: ["Using recent TikTok videos and engagement stats."],
  };
}

export async function fetchInstagramPerformanceSignal({
  accountName,
  accessToken,
}: {
  accountName?: string;
  accessToken?: string;
}): Promise<PlatformDataSignal> {
  if (!accessToken) {
    return unavailablePlatform("Instagram", accountName, "Instagram is not connected yet.");
  }

  const url = new URL("https://graph.instagram.com/v24.0/me/media");
  url.searchParams.set("fields", "id,caption,media_type,permalink,timestamp,like_count,comments_count");
  url.searchParams.set("limit", "10");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    return unavailablePlatform(
      "Instagram",
      accountName,
      "Instagram media data was not available. Extra Instagram permissions or review may be needed.",
    );
  }

  const body = (await response.json()) as {
    data?: Array<{
      caption?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    }>;
  };

  return {
    platform: "Instagram",
    accountName,
    status: "available",
    recentItems: (body.data ?? []).map((media) => ({
      caption: media.caption,
      url: media.permalink,
      publishedAt: media.timestamp,
      metrics: {
        likes: media.like_count,
        comments: media.comments_count,
      },
    })),
    notes: ["Using recent Instagram media and engagement stats."],
  };
}

export async function optimizeMetadataWithOpenAI({
  caption,
  currentTitle,
  currentHashtags,
  channelName,
  recentUploads,
  platformSignals = [
    {
      platform: "YouTube",
      accountName: channelName,
      status: "limited",
      recentItems: recentUploads,
      notes: ["Using recent public YouTube titles."],
    },
  ],
  apiKey,
  model,
  endpoint,
  headers,
}: {
  caption: string;
  currentTitle?: string;
  currentHashtags?: string;
  channelName?: string;
  recentUploads: YouTubeRecentUpload[];
  platformSignals?: PlatformDataSignal[];
  apiKey?: string;
  model?: string;
  endpoint?: string;
  headers?: Record<string, string>;
}): Promise<MetadataOptimizationResult> {
  const provider = getMetadataProvider({
    apiKey,
    model,
    endpoint,
    headers,
  });

  if (!provider.apiKey) {
    throw new Error("AI optimization is not configured yet.");
  }

  const recentTitles = recentUploads.map((upload) => upload.title);
  const response = await fetch(provider.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
      ...provider.headers,
    },
    body: JSON.stringify({
      model: provider.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You optimize short-form video metadata for YouTube Shorts, TikTok, and Instagram Reels. Return only JSON with 3 suggestions. Titles must be punchy, specific, and 100 characters or fewer. Hashtags must work cross-platform, include #shorts when appropriate, and avoid spam.",
        },
        {
          role: "user",
          content: JSON.stringify({
            channelName,
            caption,
            currentTitle,
            currentHashtags,
            recentYouTubeTitles: recentTitles,
            platformSignals,
            requiredJsonShape: {
              suggestions: [
                {
                  title: "string under 100 characters",
                  hashtags: ["#example"],
                  rationale: "brief reason",
                },
              ],
            },
          }),
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error("AI optimization failed. Please try again.");
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = body.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI optimization returned no suggestions.");
  }

  const parsed = openAiSuggestionSchema.parse(JSON.parse(content));

  return {
    suggestions: parsed.suggestions.map((suggestion) => ({
      title: suggestion.title,
      hashtags: normalizeHashtags(suggestion.hashtags).slice(0, 8),
      rationale: suggestion.rationale,
    })),
    basedOn: {
      channelName,
      recentTitles,
      platforms: platformSignals,
    },
  };
}

function getMetadataProvider(overrides: {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  headers?: Record<string, string>;
} = {}) {
  if (overrides.apiKey || overrides.model || overrides.endpoint || overrides.headers) {
    return {
      apiKey: overrides.apiKey ?? process.env.OPENAI_API_KEY,
      model: overrides.model ?? process.env.OPENAI_METADATA_MODEL ?? "gpt-4.1-mini",
      endpoint: overrides.endpoint ?? "https://api.openai.com/v1/chat/completions",
      headers: overrides.headers ?? {},
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_METADATA_MODEL ?? "openai/gpt-4.1-mini",
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      headers: {
        "HTTP-Referer": process.env.NEXTAUTH_URL ?? "https://www.aegisrelay.app",
        "X-Title": "Aegis Relay",
      },
    };
  }

  return {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_METADATA_MODEL ?? "gpt-4.1-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
    headers: {},
  };
}

export function normalizeHashtags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.trim().replace(/^#+/, "");
    const normalized = tag ? `#${tag.replace(/[^\p{L}\p{N}_]/gu, "")}` : "";
    const key = normalized.toLowerCase();

    if (normalized.length > 1 && !seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }

  return result;
}

function parseYouTubeUploadFeed(xml: string): YouTubeRecentUpload[] {
  return Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).map((entry) => {
    const entryXml = entry[1] ?? "";
    return {
      title: decodeXml(readXmlValue(entryXml, "title")),
      url: readXmlAttribute(entryXml, "link", "href"),
      publishedAt: readXmlValue(entryXml, "published") || undefined,
    };
  }).filter((upload) => upload.title);
}

function readYouTubeVideoId(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.split("/").filter(Boolean)[0];
    }

    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

function parseMetric(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function hasScope(scopes: string | undefined, scope: string) {
  return (scopes ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .includes(scope);
}

function unavailablePlatform(
  platform: PlatformDataSignal["platform"],
  accountName: string | undefined,
  note: string,
): PlatformDataSignal {
  return {
    platform,
    accountName,
    status: "unavailable",
    recentItems: [],
    notes: [note],
  };
}

function readXmlValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.trim() ?? "";
}

function readXmlAttribute(xml: string, tag: string, attribute: string) {
  const tagMatch = xml.match(new RegExp(`<${tag}[^>]*>`));
  const attrMatch = tagMatch?.[0].match(new RegExp(`${attribute}="([^"]*)"`));
  return decodeXml(attrMatch?.[1] ?? "");
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}
