import { z } from "zod";

export type YouTubeRecentUpload = {
  title: string;
  url: string;
  publishedAt?: string;
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

export async function optimizeMetadataWithOpenAI({
  caption,
  currentTitle,
  currentHashtags,
  channelName,
  recentUploads,
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_METADATA_MODEL ?? "chat-latest",
}: {
  caption: string;
  currentTitle?: string;
  currentHashtags?: string;
  channelName?: string;
  recentUploads: YouTubeRecentUpload[];
  apiKey?: string;
  model?: string;
}): Promise<MetadataOptimizationResult> {
  if (!apiKey) {
    throw new Error("AI optimization is not configured yet.");
  }

  const recentTitles = recentUploads.map((upload) => upload.title);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You optimize YouTube Shorts metadata for creators. Return only JSON with 3 suggestions. Titles must be punchy, specific, and 100 characters or fewer. Hashtags must include #shorts when appropriate and avoid spam.",
        },
        {
          role: "user",
          content: JSON.stringify({
            channelName,
            caption,
            currentTitle,
            currentHashtags,
            recentYouTubeTitles: recentTitles,
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
    },
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
