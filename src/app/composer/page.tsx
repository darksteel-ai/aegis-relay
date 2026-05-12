import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { ComposerForm } from "./composer-form";

export const dynamic = "force-dynamic";

export default async function ComposerPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  return (
    <AppShell>
      <div className="grid gap-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-500">Composer</p>
          <h1 className="text-3xl font-semibold tracking-normal">Create a scheduled post</h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-600">
            Upload one short-form video, choose the channels, and schedule it for
            the current workspace.
          </p>
        </div>

        <section className="max-w-4xl">
          <ComposerForm />
        </section>
      </div>
    </AppShell>
  );
}
