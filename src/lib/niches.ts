export type Niche = {
  slug: string;
  name: string;
  audience: string;
  headline: string;
  headlineAccent: string;
  subhead: string;
  pains: Array<{ title: string; description: string }>;
  workflow: Array<{ title: string; description: string }>;
  samplePosts: string[];
  communities: string[];
};

export const niches: Niche[] = [
  {
    slug: "real-estate",
    name: "Real estate agents",
    audience: "Agents and brokerages posting listings and market updates",
    headline: "Post every listing to TikTok, Reels, and Shorts",
    headlineAccent: "without redoing it three times.",
    subhead:
      "Film the walkthrough once. Relaygator schedules it to TikTok, Instagram Reels, and YouTube Shorts with captions tuned per platform — so every listing gets full reach while you're at the next showing.",
    pains: [
      {
        title: "Listings expire, content backlogs don't move",
        description:
          "A walkthrough video that posts a week late markets a house that's already under contract.",
      },
      {
        title: "Three apps, three caption boxes, three uploads",
        description:
          "Reposting the same tour to TikTok, Reels, and Shorts by hand eats the hour you had between showings.",
      },
      {
        title: "Inconsistent posting kills the algorithm",
        description:
          "Platforms reward agents who show up daily. Manual posting makes daily impossible during busy weeks.",
      },
    ],
    workflow: [
      {
        title: "Upload the walkthrough",
        description: "One vertical video from your phone — listing tour, market update, or neighborhood spotlight.",
      },
      {
        title: "Tune captions per platform",
        description: "Address and link for Reels, hashtags for TikTok, searchable title for Shorts — AI-suggested.",
      },
      {
        title: "Schedule the week in one sitting",
        description: "Queue every listing for prime evening slots and get back to clients.",
      },
    ],
    samplePosts: [
      "Listing walkthrough with price and beds/baths overlay",
      "60-second market update for your farm area",
      "\"What $450k buys here\" neighborhood comparison",
    ],
    communities: ["Local realtor Facebook groups", "r/realtors", "Brokerage team channels"],
  },
  {
    slug: "fitness-coaches",
    name: "Fitness coaches",
    audience: "Personal trainers and online coaches growing a client pipeline",
    headline: "Your workout clips, on every platform,",
    headlineAccent: "while you're still in the gym.",
    subhead:
      "Clients come from being seen daily. Relaygator takes one training clip and schedules it across TikTok, Reels, and Shorts — so your content posts while you coach.",
    pains: [
      {
        title: "Posting time is unpaid time",
        description:
          "Every minute spent re-uploading clips and rewriting captions is a minute not spent with paying clients.",
      },
      {
        title: "One platform grows, the others starve",
        description:
          "Most coaches go all-in on one app and leave the audiences on the other two untouched.",
      },
      {
        title: "Consistency beats production value — but it's hard",
        description:
          "The coaches who win post daily for months. That doesn't happen without a queue.",
      },
    ],
    workflow: [
      {
        title: "Film during sessions",
        description: "Form breakdowns, client wins, quick demos — the content you're already creating.",
      },
      {
        title: "Batch-schedule on Sunday",
        description: "Queue a week of posts in 30 minutes with per-platform captions and hashtags.",
      },
      {
        title: "Stay visible every day",
        description: "Your feed stays active across all three platforms while you train clients.",
      },
    ],
    samplePosts: [
      "3 form mistakes everyone makes on deadlifts",
      "Client transformation with a training-split breakdown",
      "\"Train with me\" day-in-the-life clip",
    ],
    communities: ["Fitness business Facebook groups", "r/personaltraining", "Coaching mastermind Discords"],
  },
  {
    slug: "restaurants",
    name: "Restaurants & food trucks",
    audience: "Local food businesses turning dishes into foot traffic",
    headline: "Tonight's special, posted everywhere,",
    headlineAccent: "before the dinner rush.",
    subhead:
      "Food video is the cheapest marketing a restaurant has — if it actually gets posted. Relaygator schedules your kitchen clips to TikTok, Reels, and Shorts so the lunch crowd sees them in time.",
    pains: [
      {
        title: "No one owns social media",
        description:
          "The owner films great clips that sit in a camera roll because service always comes first.",
      },
      {
        title: "Timing is everything and always missed",
        description:
          "A special posted at 9pm sells nothing. Posts need to land before people decide where to eat.",
      },
      {
        title: "Local reach lives on three platforms now",
        description:
          "Your next regular might find you on TikTok, Reels, or Shorts — being on one means missing two.",
      },
    ],
    workflow: [
      {
        title: "Film during prep",
        description: "Plating shots, sizzle clips, behind-the-counter moments — 30 seconds is plenty.",
      },
      {
        title: "Schedule for decision hours",
        description: "Queue posts to land at 11am and 4:30pm, when people pick where to eat.",
      },
      {
        title: "Fill the calendar weekly",
        description: "One batch session covers specials, events, and staff features for the week.",
      },
    ],
    samplePosts: [
      "Tonight's special, plated in slow motion",
      "\"How we make it\" 30-second kitchen clip",
      "Friday event announcement with crowd footage",
    ],
    communities: ["Local restaurant owner groups", "r/restaurateur", "Chamber of commerce networks"],
  },
  {
    slug: "podcasters",
    name: "Podcasters",
    audience: "Shows turning full episodes into daily short-form clips",
    headline: "Every episode becomes a week of clips,",
    headlineAccent: "scheduled before it even airs.",
    subhead:
      "Clips are how podcasts grow now. Relaygator schedules your episode highlights across TikTok, Reels, and Shorts with per-platform titles and hashtags — one queue for the whole drop.",
    pains: [
      {
        title: "Clips get made, then don't get posted",
        description:
          "You cut five highlights per episode and post two of them, late, on one platform.",
      },
      {
        title: "Each platform wants different metadata",
        description:
          "Shorts needs a searchable title, TikTok needs hashtags, Reels needs a hook caption. Doing that by hand 15 times a week doesn't happen.",
      },
      {
        title: "Growth needs a drumbeat, not a dump",
        description:
          "Posting five clips at once buries them. Spacing them daily across platforms is what compounds.",
      },
    ],
    workflow: [
      {
        title: "Upload the week's clips",
        description: "Drop in every highlight from the new episode in one batch.",
      },
      {
        title: "Tune titles per platform",
        description: "AI-suggested titles and hashtags matched to each platform's format.",
      },
      {
        title: "Drip them out daily",
        description: "Schedule one clip per day per platform and let the episode promote itself all week.",
      },
    ],
    samplePosts: [
      "Guest's most controversial 45 seconds",
      "Host reaction clip with captions burned in",
      "\"Full episode out now\" teaser with hook question",
    ],
    communities: ["r/podcasting", "Podcast editor Discords", "Podcast movement groups"],
  },
];

export const nicheSlugs = niches.map((niche) => niche.slug);

export function getNiche(slug: string | null | undefined) {
  return niches.find((niche) => niche.slug === slug) ?? null;
}
