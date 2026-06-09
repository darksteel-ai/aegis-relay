import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import { ComposerForm } from "./composer-form";

export const dynamic = "force-dynamic";

export default async function ComposerPage({
  searchParams,
}: {
  searchParams?: Promise<{ media?: string }>;
}) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const connectedAccounts = isConvexConfigured()
    ? await getConvexClient().query(convexApi.connections.listForUser, {
        userId: session.user.id,
      })
    : [];
  const mediaLibrary = isConvexConfigured()
    ? await getConvexClient().query(convexApi.posts.mediaLibrary, {
        userId: session.user.id,
        limit: 12,
      })
    : [];
  const selectedMediaId = (await searchParams)?.media;

  return (
    <AppShell>
      <div className="grid gap-6">
        <div className="space-y-3">
          <span className="eyebrow-chip">Composer</span>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Create a <span className="text-gradient-static">scheduled post</span>
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-400">
            Upload one short-form video, choose the channels, and schedule it for
            the current workspace.
          </p>
        </div>

        <section className="studio-panel max-w-5xl p-6">
          <ComposerForm
            connectedAccounts={connectedAccounts}
            initialMediaId={selectedMediaId}
            mediaLibrary={mediaLibrary}
          />
        </section>
      </div>
    </AppShell>
  );
}
