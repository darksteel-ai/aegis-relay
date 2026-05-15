import { afterEach, describe, expect, test, vi } from "vitest";

import {
  fetchYouTubeRecentUploads,
  normalizeHashtags,
  optimizeMetadataWithOpenAI,
} from "@/lib/ai/metadata-optimizer";

describe("metadata optimizer", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
      },
    });
  });
});
