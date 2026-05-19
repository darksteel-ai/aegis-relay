import { afterEach, describe, expect, test, vi } from "vitest";

import {
  fetchInstagramPerformanceSignal,
  fetchTikTokPerformanceSignal,
  fetchYouTubePerformanceSignal,
  fetchYouTubeRecentUploads,
  normalizeHashtags,
  optimizeMetadataWithOpenAI,
} from "@/lib/ai/metadata-optimizer";

describe("metadata optimizer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  test("normalizes hashtag suggestions", () => {
    expect(normalizeHashtags(["shorts", "#AI", "creator-tools", "#ai"])).toEqual([
      "#shorts",
      "#AI",
      "#creatortools",
    ]);
  });

  test("reads recent upload titles from the YouTube feed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(`
      <feed>
        <entry>
          <title>3 AI Tools &amp; Workflows</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v=abc" />
          <published>2026-05-01T12:00:00+00:00</published>
        </entry>
      </feed>
    `, { status: 200 })));

    await expect(fetchYouTubeRecentUploads("channel_123")).resolves.toEqual([
      {
        title: "3 AI Tools & Workflows",
        url: "https://www.youtube.com/watch?v=abc",
        publishedAt: "2026-05-01T12:00:00+00:00",
      },
    ]);
  });

  test("enriches YouTube uploads with stats when a token is available", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(`
      <feed>
        <entry>
          <title>3 AI Tools</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v=abc" />
          <published>2026-05-01T12:00:00+00:00</published>
        </entry>
      </feed>
    `, { status: 200 }))
      .mockResolvedValueOnce(Response.json({
        items: [
          {
            id: "abc",
            snippet: {
              title: "3 AI Tools",
              publishedAt: "2026-05-01T12:00:00Z",
            },
            statistics: {
              viewCount: "1200",
              likeCount: "90",
              commentCount: "8",
            },
          },
        ],
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchYouTubePerformanceSignal({
      channelId: "channel_123",
      accountName: "Aegis Relay",
      accessToken: "youtube-token",
    })).resolves.toMatchObject({
      platform: "YouTube",
      status: "available",
      recentItems: [
        {
          title: "3 AI Tools",
          metrics: {
            views: 1200,
            likes: 90,
            comments: 8,
          },
        },
      ],
    });
  });

  test("explains when TikTok video data needs an additional scope", async () => {
    await expect(fetchTikTokPerformanceSignal({
      accountName: "Aegis TikTok",
      accessToken: "tiktok-token",
      scopes: "user.info.basic,video.upload",
    })).resolves.toMatchObject({
      platform: "TikTok",
      status: "limited",
      notes: ["Reconnect TikTok after video.list is approved to use recent TikTok video data."],
    });
  });

  test("reads Instagram media engagement when available", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      data: [
        {
          caption: "Launch day reel",
          permalink: "https://instagram.com/p/1",
          timestamp: "2026-05-02T12:00:00+0000",
          like_count: 40,
          comments_count: 3,
        },
      ],
    })));

    await expect(fetchInstagramPerformanceSignal({
      accountName: "Aegis Instagram",
      accessToken: "instagram-token",
    })).resolves.toMatchObject({
      platform: "Instagram",
      status: "available",
      recentItems: [
        {
          caption: "Launch day reel",
          metrics: {
            likes: 40,
            comments: 3,
          },
        },
      ],
    });
  });

  test("returns structured OpenAI metadata suggestions", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  title: "Batch 10 Shorts Before Lunch",
                  hashtags: ["shorts", "#AI", "creator workflow"],
                  rationale: "Matches recent practical workflow titles.",
                },
              ],
            }),
          },
        },
      ],
    })));

    await expect(optimizeMetadataWithOpenAI({
      caption: "Batch short-form clips faster.",
      channelName: "Aegis Relay",
      recentUploads: [{ title: "3 AI Tools That Save Hours", url: "https://youtu.be/1" }],
      apiKey: "sk-test",
    })).resolves.toEqual({
      suggestions: [
        {
          title: "Batch 10 Shorts Before Lunch",
          hashtags: ["#shorts", "#AI", "#creatorworkflow"],
          rationale: "Matches recent practical workflow titles.",
        },
      ],
      basedOn: {
        channelName: "Aegis Relay",
        recentTitles: ["3 AI Tools That Save Hours"],
        platforms: [
          {
            platform: "YouTube",
            accountName: "Aegis Relay",
            status: "limited",
            recentItems: [{ title: "3 AI Tools That Save Hours", url: "https://youtu.be/1" }],
            notes: ["Using recent public YouTube titles."],
          },
        ],
      },
    });
  });

  test("uses OpenRouter when an OpenRouter key is configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-test");
    vi.stubEnv("OPENROUTER_METADATA_MODEL", "openai/gpt-4.1-mini");
    vi.stubEnv("NEXTAUTH_URL", "https://www.aegisrelay.app");
    const fetchMock = vi.fn(async () => Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  title: "One Commander Nobody Saw Coming",
                  hashtags: ["#MTG", "#Commander", "#Shorts"],
                  rationale: "Targets commander curiosity and short-form discovery.",
                },
              ],
            }),
          },
        },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await optimizeMetadataWithOpenAI({
      caption: "Commander of the Day.",
      recentUploads: [],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer or-test",
          "HTTP-Referer": "https://www.aegisrelay.app",
          "X-Title": "Aegis Relay",
        }),
      }),
    );
  });
});
