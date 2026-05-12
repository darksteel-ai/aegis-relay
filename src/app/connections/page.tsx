import { ExternalLink, LockKeyhole, PlugZap } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPlatformLabel } from "@/lib/posts/display";

export const dynamic = "force-dynamic";

const platformRows = [
  {
    platform: "YOUTUBE",
    name: "YouTube Shorts",
    description: "Connect a channel for scheduled Shorts publishing.",
    action: "Connect YouTube",
    href: "/api/oauth/youtube/start",
    connectable: true,
  },
  {
    platform: "TIKTOK",
    name: "TikTok",
    description: "Publishing is prepared while app approval is pending.",
    action: "Approval pending",
    connectable: false,
  },
  {
    platform: "INSTAGRAM",
    name: "Instagram Reels",
    description: "Publishing is prepared while app approval is pending.",
    action: "Approval pending",
    connectable: false,
  },
] as const;

export default async function ConnectionsPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    select: {
      workspace: {
        select: {
          name: true,
          connectedAccounts: {
            orderBy: { updatedAt: "desc" },
          },
        },
      },
    },
  });

  const accountsByPlatform = new Map(
    (membership?.workspace.connectedAccounts ?? []).map((account) => [
      account.platform,
      account,
    ]),
  );

  return (
    <AppShell>
      <div className="grid gap-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-500">Connections</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Platform connections
          </h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-600">
            {membership?.workspace.name
              ? `Manage publishing access for ${membership.workspace.name}.`
              : "Manage publishing access for the current workspace."}
          </p>
        </div>

        <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          <ul className="divide-y divide-neutral-200">
            {platformRows.map((row) => {
              const account = accountsByPlatform.get(row.platform);
              const status = account?.status ?? "APPROVAL_PENDING";

              return (
                <li
                  key={row.platform}
                  className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-neutral-950">
                        {row.name}
                      </h2>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-sm leading-6 text-neutral-600">
                      {account
                        ? `${account.accountName} connected as ${formatPlatformLabel(account.platform)}.`
                        : row.description}
                    </p>
                    {account ? (
                      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500">
                        <div>
                          <dt className="sr-only">External account id</dt>
                          <dd>ID {account.externalId}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">Token expiration</dt>
                          <dd>
                            {account.expiresAt
                              ? `Expires ${account.expiresAt.toLocaleDateString("en")}`
                              : "No token expiration stored"}
                          </dd>
                        </div>
                      </dl>
                    ) : null}
                  </div>

                  {row.connectable ? (
                    <a
                      className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100"
                      href={row.href}
                    >
                      {account ? "Reconnect" : row.action}
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-4 text-sm font-medium text-neutral-600">
                      <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                      {row.action}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <PlugZap className="h-4 w-4" aria-hidden="true" />
          Connected accounts are scoped to the signed-in workspace.
        </div>
      </div>
    </AppShell>
  );
}
