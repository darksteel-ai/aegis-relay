import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatDuration,
  formatFileSize,
  formatPlatformLabel,
  formatScheduledAtForDashboard,
} from "@/lib/posts/display";

export const dynamic = "force-dynamic";

type PostDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { postId } = await params;
  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: { workspaceId: true },
  });

  if (!membership) {
    redirect("/dashboard");
  }

  const post = await db.scheduledPost.findFirst({
    where: {
      id: postId,
      workspaceId: membership.workspaceId,
    },
    include: {
      video: true,
      platformPosts: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const hasRetryablePost = post.platformPosts.some((platformPost) =>
    ["FAILED", "BLOCKED"].includes(platformPost.status),
  );

  return (
    <AppShell>
      <div className="grid gap-8">
        <div className="space-y-5">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Calendar
          </Link>

          <div className="space-y-3">
            <p className="text-sm font-medium text-neutral-500">Post detail</p>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-normal">
              {post.baseCaption}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-neutral-600">
              Scheduled for{" "}
              {formatScheduledAtForDashboard(post.scheduledAt, post.timezone)} in{" "}
              {post.timezone}.
            </p>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-md border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-950">Video</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">File name</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {post.video.fileName}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">MIME type</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {post.video.mimeType}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">File size</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {formatFileSize(post.video.sizeBytes)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Duration</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {formatDuration(post.video.durationSec)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Resolution</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {post.video.width && post.video.height
                    ? `${post.video.width} x ${post.video.height}`
                    : "Unknown resolution"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Storage key</dt>
                <dd className="mt-1 break-all font-medium text-neutral-950">
                  {post.video.storageKey}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-neutral-200 bg-white p-6">
            <h2 className="text-base font-semibold text-neutral-950">Schedule</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-neutral-500">Scheduled time</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {formatScheduledAtForDashboard(post.scheduledAt, post.timezone)}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Timezone</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {post.timezone}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">Created</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {formatScheduledAtForDashboard(post.createdAt, post.timezone)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="rounded-md border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-4">
            <h2 className="text-base font-semibold text-neutral-950">
              Platform posts
            </h2>
          </div>
          <ul className="divide-y divide-neutral-200">
            {post.platformPosts.map((platformPost) => (
              <li key={platformPost.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-950">
                      {formatPlatformLabel(platformPost.platform)}
                    </h3>
                    <StatusBadge status={platformPost.status} />
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-neutral-500">Caption</dt>
                      <dd className="mt-1 text-neutral-900">
                        {platformPost.caption}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Privacy</dt>
                      <dd className="mt-1 font-medium text-neutral-950">
                        {platformPost.privacy}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Platform ID</dt>
                      <dd className="mt-1 break-all font-medium text-neutral-950">
                        {platformPost.platformPostId ?? "Not published yet"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Published URL</dt>
                      <dd className="mt-1 break-all font-medium text-neutral-950">
                        {platformPost.platformPostUrl ? (
                          <a
                            href={platformPost.platformPostUrl}
                            className="text-neutral-950 underline underline-offset-2 hover:text-neutral-700"
                          >
                            {platformPost.platformPostUrl}
                          </a>
                        ) : (
                          "Not published yet"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Last error</dt>
                      <dd className="mt-1 text-neutral-900">
                        {platformPost.lastError ?? "No error recorded"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-md border border-neutral-200 bg-white p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-neutral-950">
                Retry publishing
              </h2>
              <p id="retry-note" className="text-sm leading-6 text-neutral-600">
                Failed or blocked platform posts can be reset to scheduled for
                the next publishing run.
              </p>
            </div>
            <form action={`/api/posts/${post.id}/retry`} method="post">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-950 hover:bg-neutral-100 disabled:bg-neutral-100 disabled:text-neutral-500"
                disabled={!hasRetryablePost}
                aria-describedby="retry-note"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {hasRetryablePost ? "Retry failed posts" : "No retry needed"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
