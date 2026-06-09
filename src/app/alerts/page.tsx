import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Bell, Info } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const alerts = isConvexConfigured()
    ? await getConvexClient().query(convexApi.posts.alerts, {
        userId: session.user.id,
        limit: 50,
      })
    : [];

  return (
    <AppShell>
      <div className="grid gap-6">
        <div>
          <span className="eyebrow-chip">Signals</span>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            <span className="text-gradient-static">Alerts</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
            Operational issues that need attention before scheduled content can keep moving.
          </p>
        </div>

        {alerts.length ? (
          <div className="grid gap-3">
            {alerts.map((alert) => (
              <Link
                className="grid gap-3 rounded-md border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-cyan-300/25 hover:bg-cyan-300/[0.05] sm:grid-cols-[2rem_minmax(0,1fr)_auto]"
                href={alert.href}
                key={alert.id}
              >
                <AlertIcon severity={alert.severity} />
                <span>
                  <span className="block font-semibold text-white">{alert.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-slate-400">
                    {alert.message}
                  </span>
                </span>
                <span className="text-sm text-slate-500">
                  {new Date(alert.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="studio-panel rounded-md p-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-cyan-200" aria-hidden="true" />
            <p className="mt-4 text-lg font-semibold text-white">No alerts right now.</p>
            <p className="mt-2 text-sm text-slate-400">
              Failed posts, approval drafts, and expiring account access will appear here.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AlertIcon({ severity }: { severity: string }) {
  if (severity === "critical") {
    return <AlertTriangle className="mt-1 h-5 w-5 text-red-300" aria-hidden="true" />;
  }

  if (severity === "warning") {
    return <AlertTriangle className="mt-1 h-5 w-5 text-amber-300" aria-hidden="true" />;
  }

  return <Info className="mt-1 h-5 w-5 text-cyan-200" aria-hidden="true" />;
}
