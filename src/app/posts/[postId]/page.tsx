import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Id } from "../../../../convex/_generated/dataModel";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import {
  formatDuration,
  formatFileSize,
  formatPlatformLabel,
  formatScheduledAtForDashboard,
} from "@/lib/posts/display";

export const dynamic = "force-dynamic";

type PostPlatformPost = {
  id: string;
  platform: string;
  caption: string;
  privacy?: string | null;
  status: string;
  platformPostId?: string | null;
  platformPostUrl?: string | null;
  lastError?: string | null;
};

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
  const post = await getConvexClient().query(convexApi.posts.detail, {
    userId: session.user.id,
    postId: postId as Id<"scheduledPosts">,
  });

  if (!post) {
    notFound();
  }

  const hasRetryablePost = post.platformPosts.some((platformPost: PostPlatformPost) =>
    ["FAILED", "BLOCKED", "APPROVAL_PENDING"].includes(platformPost.status),
  );

  return (
    <AppShell>
      <div className="grid gap-6">
        <div className="space-y-5">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Calendar
          </Link>

          <div className="space-y-3">
            <h1 className="max-w-4xl text-4xl font-semibold tracking-normal text-white">
              {post.baseCaption}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-400">
              Scheduled for{" "}
              {formatScheduledAtForDashboard(new Date(post.scheduledAt), post.timezone)} in{" "}
              {post.timezone}.
            </p>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="studio-panel rounded-md p-6">
            <h2 className="text-base font-semibold text-white">Video</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">File name</dt>
                <dd className="mt-1 font-medium text-white">
                  {post.video.fileName}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">MIME type</dt>
                <dd className="mt-1 font-medium text-white">
                  {post.video.mimeType}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">File size</dt>
                <dd className="mt-1 font-medium text-white">
                  {formatFileSize(post.video.sizeBytes)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Duration</dt>
                <dd className="mt-1 font-medium text-white">
                  {formatDuration(post.video.durationSec)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Resolution</dt>
                <dd className="mt-1 font-medium text-white">
                  {post.video.width && post.video.height
                    ? `${post.video.width} x ${post.video.height}`
                    : "Unknown resolution"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Storage key</dt>
                <dd className="mt-1 break-all font-medium text-white">
                  {post.video.storageKey}
                </dd>
              </div>
            </dl>
          </div>

          <div className="studio-panel rounded-md p-6">
            <h2 className="text-base font-semibold text-white">Schedule</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Scheduled time</dt>
                <dd className="mt-1 font-medium text-white">
                  {formatScheduledAtForDashboard(new Date(post.scheduledAt), post.timezone)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Timezone</dt>
                <dd className="mt-1 font-medium text-white">
                  {post.timezone}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="mt-1 font-medium text-white">
                  {formatScheduledAtForDashboard(new Date(post.createdAt), post.timezone)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="studio-panel overflow-hidden rounded-md">
          <div className="border-b border-white/10 p-4">
            <h2 className="text-base font-semibold text-white">
              Platform posts
            </h2>
          </div>
          <ul className="divide-y divide-white/10">
            {post.platformPosts.map((platformPost: PostPlatformPost) => (
              <li key={platformPost.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {formatPlatformLabel(platformPost.platform)}
                    </h3>
                    <StatusBadge status={platformPost.status} />
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Caption</dt>
                      <dd className="mt-1 text-slate-200">
                        {platformPost.caption}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Privacy</dt>
                      <dd className="mt-1 font-medium text-white">
                        {platformPost.privacy}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Platform ID</dt>
                      <dd className="mt-1 break-all font-medium text-white">
                        {platformPost.platformPostId ?? "Not published yet"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Published URL</dt>
                      <dd className="mt-1 break-all font-medium text-white">
                        {platformPost.platformPostUrl ? (
                          <a
                            href={platformPost.platformPostUrl}
                            className="text-cyan-200 underline underline-offset-2 hover:text-cyan-100"
                          >
                            {platformPost.platformPostUrl}
                          </a>
                        ) : (
                          "Not published yet"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Last error</dt>
                      <dd className="mt-1 text-slate-200">
                        {platformPost.lastError ?? "No error recorded"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="studio-panel rounded-md p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-white">
                Retry publishing
              </h2>
              <p id="retry-note" className="text-sm leading-6 text-slate-400">
                Failed or blocked platform posts can be reset to scheduled for
                the next publishing run.
              </p>
            </div>
            <form action={`/api/posts/${post.id}/retry`} method="post">
              <button
                type="submit"
                className="studio-button-secondary disabled:bg-white/[0.04] disabled:text-slate-500"
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
