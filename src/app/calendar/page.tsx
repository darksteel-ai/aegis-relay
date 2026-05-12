import { CalendarPlus, Clock3 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
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
  const client = getConvexClient();
  const [workspace, postsResult] = await Promise.all([
    client.query(convexApi.workspaces.getForUser, { userId: session.user.id }),
    client.query(convexApi.posts.calendar, {
      userId: session.user.id,
      start: calendarWindow.start.getTime(),
      end: calendarWindow.end.getTime(),
      limit: calendarWindow.take,
    }),
  ]);
  const posts: CalendarPost[] = (postsResult ?? []).filter(
    (post): post is CalendarPost => post !== null,
  );

  return (
    <AppShell>
      <div className="grid gap-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-500">Calendar</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Scheduled posts
            </h1>
            <p className="max-w-2xl text-base leading-7 text-neutral-600">
              {workspace?.name
                ? `Upcoming and historical publishing status for ${workspace.name}.`
                : "Upcoming and historical publishing status for the current workspace."}
            </p>
          </div>
          <Link
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            href="/composer"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            New post
          </Link>
        </div>

        <section>
          {posts.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
              <ul className="divide-y divide-neutral-200">
                {posts.map((post) => (
                  <li key={post.id} className="p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0 space-y-2">
                        <Link
                          href={`/posts/${post.id}`}
                          className="block truncate text-sm font-semibold text-neutral-950 hover:underline"
                        >
                          {post.baseCaption}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600">
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
                            className="inline-flex items-center gap-2 rounded-md border border-neutral-200 px-2.5 py-1.5"
                          >
                            <span className="text-xs font-medium text-neutral-600">
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
            <div className="rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-600">
              No scheduled posts yet. Create a post to see platform status here.
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
