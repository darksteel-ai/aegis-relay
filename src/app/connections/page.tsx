import {
  AlertTriangle,
  Camera,
  CircleMinus,
  ExternalLink,
  LockKeyhole,
  Music2,
  PlaySquare,
  PlugZap,
} from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getAuthSession } from "@/lib/auth";
import { getConnectionHealth } from "@/lib/connections/health";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import {
  formatPlatformLabel,
} from "@/lib/posts/display";

export const dynamic = "force-dynamic";

const platformRows = [
  {
    platform: "YOUTUBE",
    name: "YouTube Shorts",
    description: "Connect a channel for scheduled Shorts publishing.",
    action: "Connect YouTube",
    href: "/api/oauth/youtube/start",
    connectable: true,
    icon: PlaySquare,
    accent: "border-red-400/45 text-red-300",
  },
  {
    platform: "TIKTOK",
    name: "TikTok",
    description: "Connect an account for TikTok video upload access.",
    action: "Connect TikTok",
    href: "/api/auth/tiktok/start",
    connectable: true,
    icon: Music2,
    accent: "border-cyan-300/45 text-cyan-200",
  },
  {
    platform: "INSTAGRAM",
    name: "Instagram Reels",
    description: "Connect a professional Instagram account for Reels publishing access.",
    action: "Connect Instagram",
    href: "/api/auth/instagram/start",
    connectable: true,
    icon: Camera,
    accent: "border-red-400/35 text-red-300",
  },
] as const;

type ConnectedAccountView = {
  id: string;
  platform: string;
  status: string;
  accountName: string;
  externalId: string;
  scopes?: string | null;
  hasRefreshToken?: boolean | null;
  expiresAt: Date | null;
  updatedAt: Date;
};

type ConnectionsPageProps = {
  searchParams?: Promise<{
    instagram?: string;
    instagram_message?: string;
    connection?: string;
    tiktok?: string;
    youtube?: string;
  }>;
};

const connectionMessages: Record<string, string> = {
  connected: "Connection saved.",
  "oauth-failed": "Connection was approved, but Aegis Relay could not save it. Check the platform app secret and try again.",
  "missing-code": "The platform did not return a connection code. Please try again.",
  "invalid-state": "The connection session expired. Please try again.",
  "missing-state": "The connection session expired. Please try again.",
};

const accountMessages: Record<string, string> = {
  disconnected: "Account disconnected.",
};

export default async function ConnectionsPage({ searchParams }: ConnectionsPageProps) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [params, client] = await Promise.all([
    searchParams,
    Promise.resolve(isConvexConfigured() ? getConvexClient() : null),
  ]);
  const workspace = client
    ? await client.query(convexApi.workspaces.getForUser, {
        userId: session.user.id,
      })
    : null;
  const connectedAccounts = client
    ? await client.query(convexApi.connections.listForUser, { userId: session.user.id })
    : [];

  const normalizedAccounts: ConnectedAccountView[] = connectedAccounts.map((account: {
      id: string;
      platform: string;
      status: string;
      accountName: string;
      externalId: string;
      scopes?: string | null;
      hasRefreshToken?: boolean | null;
      expiresAt?: number | null;
      updatedAt: number;
    }) => ({
      ...account,
      expiresAt: account.expiresAt ? new Date(account.expiresAt) : null,
      updatedAt: new Date(account.updatedAt),
    }));
  const accountsByPlatform = normalizedAccounts.reduce((map, account) => {
    const accounts = map.get(account.platform) ?? [];
    accounts.push(account);
    map.set(account.platform, accounts);
    return map;
  }, new Map<string, ConnectedAccountView[]>());

  return (
    <AppShell>
      <div className="grid gap-6">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-normal text-white">
            Platform connections
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-400">
            {workspace?.name
              ? `Manage publishing access for ${workspace.name}.`
              : "Manage publishing access for the current workspace."}
          </p>
        </div>

        {!client ? (
          <div className="flex gap-3 rounded-md border border-amber-300/35 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <p>
              Database setup is required before accounts can be connected. Finish
              the Convex cloud setup, then YouTube connections will be enabled.
            </p>
          </div>
        ) : null}

        {params?.instagram && connectionMessages[params.instagram] ? (
          <div
            className={
              params.instagram === "connected"
                ? "rounded-md border border-emerald-300/35 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
                : "rounded-md border border-red-300/40 bg-red-400/10 px-4 py-3 text-sm text-red-100"
            }
            role="status"
          >
            Instagram: {params.instagram_message ?? connectionMessages[params.instagram]}
          </div>
        ) : null}

        {params?.connection && accountMessages[params.connection] ? (
          <div
            className="rounded-md border border-emerald-300/35 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
            role="status"
          >
            {accountMessages[params.connection]}
          </div>
        ) : null}

        <section className="studio-panel rounded-md p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Publishing channels</h2>
              <p className="mt-1 text-sm text-slate-500">OAuth access for every customer workspace.</p>
            </div>
            <PlugZap className="h-5 w-5 text-cyan-200" aria-hidden="true" />
          </div>
          <ul className="grid gap-3">
            {platformRows.map((row) => {
              const accounts = accountsByPlatform.get(row.platform) ?? [];
              const primaryAccount = accounts[0];
              const status = primaryAccount?.status ?? "APPROVAL_PENDING";
              const needsDatabase =
                (row.platform === "YOUTUBE" ||
                  row.platform === "TIKTOK" ||
                  row.platform === "INSTAGRAM") &&
                !client;
              const canConnect = row.connectable && !needsDatabase;

              return (
                <li
                  key={row.platform}
                  className={`grid gap-4 rounded-md border bg-black/25 p-4 sm:grid-cols-[1fr_auto] sm:items-center ${row.accent}`}
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <row.icon className="h-5 w-5" aria-hidden="true" />
                      <h3 className="text-base font-semibold text-white">
                        {row.name}
                      </h3>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-sm leading-6 text-slate-400">
                      {accounts.length
                        ? `${accounts.length} ${formatPlatformLabel(row.platform)} ${accounts.length === 1 ? "account" : "accounts"} connected.`
                        : needsDatabase
                          ? `${row.name} OAuth is ready, but account storage must be connected first.`
                          : row.description}
                    </p>
                    {accounts.length ? (
                      <ul className="grid gap-2 pt-1">
                        {accounts.map((account) => {
                          const health = getConnectionHealth(account);

                          return (
                            <li
                              className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 md:grid-cols-[1fr_auto] md:items-center"
                              key={account.id}
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-white">{account.accountName}</span>
                                  <span className="text-xs text-slate-500">ID {account.externalId}</span>
                                  <span className="text-xs text-cyan-100">{health.label}</span>
                                </div>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {health.message}
                                </p>
                              </div>
                              <form action={`/api/connections/${account.id}/disconnect`} method="post">
                                <button
                                  className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-md border border-red-300/30 bg-red-400/10 px-3 text-sm font-semibold text-red-100 transition hover:border-red-200/60 hover:bg-red-400/15"
                                  type="submit"
                                >
                                  <CircleMinus className="h-4 w-4" aria-hidden="true" />
                                  Disconnect
                                </button>
                              </form>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>

                  {canConnect ? (
                    <a
                      className={accounts.length ? "studio-button-secondary w-fit" : "studio-button-primary w-fit"}
                      href={row.href}
                    >
                      {accounts.length ? "Add another" : row.action}
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-500">
                      <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                      {needsDatabase ? "Setup required" : row.action}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <PlugZap className="h-4 w-4" aria-hidden="true" />
          Connected accounts are scoped to the signed-in workspace.
        </div>
      </div>
    </AppShell>
  );
}
