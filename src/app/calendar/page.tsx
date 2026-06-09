import { CalendarPlus, Clock3 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import {
  formatPlatformLabel,
  formatScheduledAtForDashboard,
  getCalendarPostWindow,
} from "@/lib/posts/display";

export const dynamic = "force-dynamic";

type CalendarPost = {
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

export default async function CalendarPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const calendarWindow = getCalendarPostWindow();
  const client = isConvexConfigured() ? getConvexClient() : null;
  const [workspace, postsResult] = client
    ? await Promise.all([
        client.query(convexApi.workspaces.getForUser, { userId: session.user.id }),
        client.query(convexApi.posts.calendar, {
          userId: session.user.id,
          start: calendarWindow.start.getTime(),
          end: calendarWindow.end.getTime(),
          limit: calendarWindow.take,
        }),
      ])
    : [null, []];
  const posts = (postsResult ?? []).filter((post) => post !== null) as CalendarPost[];

  return (
    <AppShell>
      <div className="grid gap-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <span className="eyebrow-chip">Calendar</span>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Scheduled <span className="text-gradient-static">posts</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-400">
              {workspace?.name
                ? `Upcoming and historical publishing status for ${workspace.name}.`
                : "Upcoming and historical publishing status for the current workspace."}
            </p>
          </div>
          <Link
            className="studio-button-primary w-fit"
            href="/composer"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            New post
          </Link>
        </div>

        <section>
          {posts.length > 0 ? (
            <div className="studio-panel overflow-hidden rounded-md">
              <ul className="divide-y divide-white/10">
                {posts.map((post) => (
                  <li key={post.id} className="p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0 space-y-2">
                        <Link
                          href={`/posts/${post.id}`}
                          className="block truncate text-sm font-semibold text-white hover:text-cyan-200"
                        >
                          {post.baseCaption}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4" aria-hidden="true" />
                            {formatScheduledAtForDashboard(
                              new Date(post.scheduledAt),
                              post.timezone,
                            )}
                          </span>
                          <span>{post.video.fileName}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {post.platformPosts.map((platformPost) => (
                          <div
                            key={platformPost.id}
                            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-2.5 py-1.5"
                          >
                            <span className="text-xs font-medium text-slate-400">
                              {formatPlatformLabel(platformPost.platform)}
                            </span>
                            <StatusBadge status={platformPost.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="studio-panel rounded-md p-6 text-sm leading-6 text-slate-400">
              No scheduled posts yet. Create a post to see platform status here.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
