import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatScheduledAtForDashboard } from "@/lib/posts/display";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: {
      workspace: {
        select: {
          name: true,
          posts: {
            orderBy: { scheduledAt: "desc" },
            take: 6,
            include: {
              video: true,
              platformPosts: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
  });
  const posts = membership?.workspace.posts ?? [];

  return (
    <AppShell>
      <div className="grid gap-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-500">Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Schedule videos across every channel.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-neutral-600">
              {membership?.workspace.name
                ? `${membership.workspace.name} is ready for scheduler flows.`
                : "This workspace is ready for scheduler flows."}
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
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-neutral-950">Recent schedule</h2>
          </div>

          {posts.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
              <ul className="divide-y divide-neutral-200">
                {posts.map((post) => (
                  <li key={post.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-950">
                        {post.baseCaption}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        {post.video.fileName} scheduled for{" "}
                        {formatScheduledAtForDashboard(post.scheduledAt, post.timezone)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {post.platformPosts.map((platformPost) => (
                        <span
                          key={platformPost.id}
                          className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700"
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
            <div className="rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-600">
              No scheduled posts yet. Create a post to see upcoming publishing
              status here.
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
