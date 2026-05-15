import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import { formatScheduledAtForDashboard } from "@/lib/posts/display";
import {
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  Eye,
  Camera,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Music2,
  PlaySquare,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type DashboardPost = {
  id: string;
  workspaceId: string;
  baseCaption: string;
  scheduledAt: number;
  timezone: string;
  createdAt: number;
  updatedAt: number;
  video: { fileName: string };
  platformPosts: Array<{ id: string; platform: string; status: string }>;
};

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const data = isConvexConfigured()
    ? await getConvexClient().query(convexApi.posts.dashboard, {
        userId: session.user.id,
        limit: 6,
      })
    : null;
  const posts: DashboardPost[] = (data?.posts ?? []).filter(
    (post): post is DashboardPost => post !== null,
  );
  const workspace = data?.workspace;
  const scheduledCount = posts.reduce(
    (count, post) =>
      count + post.platformPosts.filter((platformPost) => platformPost.status === "SCHEDULED").length,
    0,
  );
  const publishedCount = posts.reduce(
    (count, post) =>
      count + post.platformPosts.filter((platformPost) => platformPost.status === "PUBLISHED").length,
    0,
  );

  return (
    <AppShell>
      <div className="grid gap-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
              Mission control for your content.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-400">
              {workspace?.name
                ? `${workspace.name} is ready for scheduler flows.`
                : "This workspace is ready for scheduler flows."}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-red-500 px-4 text-sm font-semibold text-white shadow-lg shadow-red-950/30 transition-colors hover:bg-red-400"
                href="/composer"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                New post
              </Link>
              <Link
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.04] px-4 text-sm font-semibold text-slate-100 transition-colors hover:bg-white/[0.08]"
                href="/connections"
              >
                <RadioTower className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                Connections
              </Link>
            </div>
          </div>

          <div className="studio-panel rounded-md p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-cyan-300/10 text-cyan-200">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Publishing guardrails</p>
                <p className="text-sm text-slate-500">Tokens, schedules, and retries stay scoped.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["Channels", "3"],
                ["Queued", String(scheduledCount || posts.length)],
                ["Mode", "Live"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Scheduled", value: scheduledCount || posts.length, icon: CalendarPlus, accent: "text-cyan-200", trend: "Ready queue" },
            { label: "Published", value: publishedCount, icon: CheckCircle2, accent: "text-emerald-200", trend: "Across channels" },
            { label: "Engagement", value: "Pending", icon: BarChart3, accent: "text-red-300", trend: "Analytics soon" },
            { label: "Views", value: "Pending", icon: Eye, accent: "text-slate-200", trend: "After publish" },
          ].map((metric) => (
            <div key={metric.label} className="studio-panel-subtle rounded-md p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-400">{metric.label}</p>
                <metric.icon className={`h-4 w-4 ${metric.accent}`} aria-hidden="true" />
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{metric.trend}</p>
            </div>
          ))}
        </section>

        <section className="studio-panel rounded-md p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Connected platforms</h2>
              <p className="mt-1 text-sm text-slate-500">Shorts, Reels, and TikTok in one relay path.</p>
            </div>
            <Link className="studio-button-secondary" href="/connections">
              Manage
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { name: "YouTube Shorts", account: "Reaper_AI", detail: "Scheduled", icon: PlaySquare, color: "border-red-400/45 text-red-300" },
              { name: "TikTok", account: "@reaper_ai", detail: "Ready for OAuth", icon: Music2, color: "border-cyan-300/45 text-cyan-200" },
              { name: "Instagram Reels", account: "reaper.ai", detail: "Professional account", icon: Camera, color: "border-red-400/35 text-red-300" },
            ].map((platform) => (
              <div key={platform.name} className={`rounded-md border bg-black/25 p-4 ${platform.color}`}>
                <div className="flex items-center gap-3">
                  <platform.icon className="h-5 w-5" aria-hidden="true" />
                  <p className="font-semibold text-white">{platform.name}</p>
                </div>
                <p className="mt-4 text-xs font-medium text-emerald-300">Connected</p>
                <p className="mt-2 text-sm text-slate-300">{platform.account}</p>
                <p className="text-xs text-slate-500">{platform.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="studio-panel rounded-md p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Upcoming schedule</h2>
              <p className="mt-1 text-sm text-slate-500">The next relays waiting in queue.</p>
            </div>
            <Sparkles className="h-5 w-5 text-cyan-200" aria-hidden="true" />
          </div>

          {posts.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-white/10 bg-black/20">
              <ul className="divide-y divide-white/10">
                {posts.map((post) => (
                  <li key={post.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {post.baseCaption}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        {post.video.fileName} scheduled for{" "}
                        {formatScheduledAtForDashboard(new Date(post.scheduledAt), post.timezone)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {post.platformPosts.map((platformPost) => (
                        <span
                          key={platformPost.id}
                          className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300"
                        >
                          {formatPlatform(platformPost.platform)}:{" "}
                          {formatStatus(platformPost.status)}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-white/[0.14] bg-white/[0.03] p-8 text-sm leading-6 text-slate-400">
              No scheduled posts yet. Create a post to see upcoming publishing status here.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatPlatform(platform: string) {
  const labels: Record<string, string> = {
    YOUTUBE: "YouTube",
    TIKTOK: "TikTok",
    INSTAGRAM: "Instagram",
  };

  return labels[platform] ?? platform;
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
