import { redirect } from "next/navigation";
import Link from "next/link";
import { UploadCloud } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const videos = isConvexConfigured()
    ? await getConvexClient().query(convexApi.posts.mediaLibrary, {
        userId: session.user.id,
        limit: 48,
      })
    : [];

  return (
    <AppShell>
      <div className="grid gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-normal text-white">Media library</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
              Reuse uploaded short-form videos without sending the same file to storage again.
            </p>
          </div>
          <Link className="studio-button-primary" href="/composer">
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            Upload video
          </Link>
        </div>

        {videos.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <article className="studio-panel-subtle rounded-md p-4" key={video.id}>
                <div className="grid aspect-[9/12] place-items-center rounded-md border border-white/10 bg-black/30 p-4 text-center">
                  <div>
                    <p className="break-words text-sm font-semibold text-white">{video.fileName}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {video.width && video.height ? `${video.width}x${video.height}` : "Video"}
                      {video.durationSec ? ` - ${Math.round(video.durationSec)} sec` : ""}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Size</dt>
                    <dd className="mt-1 font-medium text-slate-200">{formatBytes(video.sizeBytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Uploaded</dt>
                    <dd className="mt-1 font-medium text-slate-200">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
                <Link
                  className="studio-button-secondary mt-4 w-full"
                  href={`/composer?media=${video.id}`}
                >
                  Use in composer
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="studio-panel rounded-md p-8 text-center">
            <p className="text-lg font-semibold text-white">No uploaded videos yet.</p>
            <p className="mt-2 text-sm text-slate-400">Upload your first vertical video in Composer.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  }

  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

