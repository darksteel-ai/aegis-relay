import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { getConnectionHealth } from "@/lib/connections/health";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import { formatScheduledAtForDashboard } from "@/lib/posts/display";
import { getMonthlyScheduledPostLimit, getMonthlyUsageWindow, getPricingPlan } from "@/lib/billing/pricing";
import {
  AlertTriangle,
  BarChart3,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  Eye,
  Camera,
  Circle,
  PlugZap,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Music2,
  PlaySquare,
  Upload,
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
  platformPosts: Array<{ id: string; platform: string; status: string; lastError?: string | null }>;
};

type DashboardAccount = {
  id: string;
  platform: string;
  accountName: string;
  externalId: string;
  scopes?: string | null;
  hasRefreshToken?: boolean | null;
  status: string;
  expiresAt?: number | null;
  updatedAt: number;
};

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const usageWindow = getMonthlyUsageWindow();
  const data = isConvexConfigured()
    ? await getConvexClient().query(convexApi.posts.dashboard, {
        userId: session.user.id,
        limit: 6,
        usageStart: usageWindow.start,
        usageEnd: usageWindow.end,
      })
    : null;
  const posts = (data?.posts ?? []).filter((post) => post !== null) as DashboardPost[];
  const workspace = data?.workspace;
  const plan = getPricingPlan(workspace?.plan);
  const monthlyLimit = getMonthlyScheduledPostLimit(workspace?.plan);
  const monthlyUsed = data?.usage?.scheduledThisMonth ?? 0;
  const usagePercent = Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100));
  const connectedAccounts: DashboardAccount[] = data?.connectedAccounts ?? [];
  const connectedPlatforms = new Set(connectedAccounts.map((account) => account.platform));
  const onboarding = data?.onboarding ?? {
    hasConnectedPlatform: false,
    connectedPlatformCount: 0,
    hasUploadedVideo: false,
    hasScheduledPost: false,
    hasBillingSetup: false,
  };
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
                className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#7ed957] to-[#30d5ff] px-4 text-sm font-semibold text-[#04100f] shadow-lg shadow-green-950/30 transition hover:brightness-110"
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
                <p className="text-sm font-semibold text-white">Plan usage</p>
                <p className="text-sm text-slate-500">{plan.name} workspace limits.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["Connected", `${connectedPlatforms.size}/3`],
                ["Used", `${monthlyUsed}/${monthlyLimit}`],
                ["Plan", plan.name],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-white/10 bg-black/25 p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#7ed957]"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>

        <section className="studio-panel rounded-md p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Launch checklist</h2>
              <p className="mt-1 text-sm text-slate-500">The shortest path to a clean first schedule.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-cyan-200" aria-hidden="true" />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              {
                label: "Connect platforms",
                done: onboarding.connectedPlatformCount >= 3,
                href: "/connections",
                detail: `${onboarding.connectedPlatformCount}/3 connected`,
                icon: PlugZap,
              },
              {
                label: "Upload first video",
                done: onboarding.hasUploadedVideo,
                href: "/composer",
                detail: onboarding.hasUploadedVideo ? "Video uploaded" : "Upload in composer",
                icon: Upload,
              },
              {
                label: "Schedule first post",
                done: onboarding.hasScheduledPost,
                href: "/composer",
                detail: onboarding.hasScheduledPost ? "Schedule created" : "Create a schedule",
                icon: CalendarPlus,
              },
              {
                label: "Set billing",
                done: onboarding.hasBillingSetup,
                href: "/billing",
                detail: onboarding.hasBillingSetup ? `${plan.name} plan` : "Choose a plan",
                icon: CreditCard,
              },
            ].map((item) => (
              <Link
                className="rounded-md border border-white/10 bg-black/25 p-4 transition-colors hover:bg-white/[0.05]"
                href={item.href}
                key={item.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <item.icon className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-500" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Scheduled", value: scheduledCount || posts.length, icon: CalendarPlus, accent: "text-cyan-200", trend: "Ready queue" },
            { label: "Published", value: publishedCount, icon: CheckCircle2, accent: "text-emerald-200", trend: "Across channels" },
            { label: "Monthly usage", value: `${monthlyUsed}/${monthlyLimit}`, icon: BarChart3, accent: "text-[#8eea57]", trend: `${plan.name} limit` },
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
              { platform: "YOUTUBE", name: "YouTube Shorts", icon: PlaySquare, color: "border-[#7ed957]/45 text-[#9cff6d]" },
              { platform: "TIKTOK", name: "TikTok", icon: Music2, color: "border-cyan-300/45 text-cyan-200" },
              { platform: "INSTAGRAM", name: "Instagram Reels", icon: Camera, color: "border-[#7ed957]/35 text-[#9cff6d]" },
            ].map((platform) => {
              const account = connectedAccounts
                .filter((item) => item.platform === platform.platform)
                .sort((a, b) => b.updatedAt - a.updatedAt)[0];
              const health = getConnectionHealth(
                account
                  ? {
                    platform: account.platform,
                    accountName: account.accountName,
                    scopes: account.scopes,
                    expiresAt: account.expiresAt ?? null,
                    hasRefreshToken: account.hasRefreshToken,
                  }
                  : null,
              );

              return (
              <div key={platform.name} className={`rounded-md border bg-black/25 p-4 ${platform.color}`}>
                <div className="flex items-center gap-3">
                  <platform.icon className="h-5 w-5" aria-hidden="true" />
                  <p className="font-semibold text-white">{platform.name}</p>
                </div>
                <p className={health.status === "connected" ? "mt-4 text-xs font-medium text-emerald-300" : "mt-4 text-xs font-medium text-amber-300"}>
                  {health.label}
                </p>
                <p className="mt-2 text-sm text-slate-300">{account?.accountName ?? "No account connected"}</p>
                <p className="text-xs leading-5 text-slate-500">{health.message}</p>
              </div>
              );
            })}
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
                    {post.platformPosts.some((platformPost) => platformPost.lastError) ? (
                      <div className="sm:col-span-2 flex gap-2 rounded-md border border-red-300/30 bg-red-400/10 px-3 py-2 text-xs text-red-100">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          {post.platformPosts.find((platformPost) => platformPost.lastError)?.lastError}
                        </span>
                      </div>
                    ) : null}
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
