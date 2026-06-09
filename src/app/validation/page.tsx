import { CheckCircle2, Circle, ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient, isConvexConfigured } from "@/lib/convex-server";
import { niches } from "@/lib/niches";

export const dynamic = "force-dynamic";

const SIGNUP_TARGET = 20;

type WaitlistStats = {
  total: number;
  countsByNiche: Record<string, number>;
  recent: Array<{
    id: string;
    email: string;
    niche: string;
    source: string | null;
    createdAt: number;
  }>;
};

const playbook = [
  "Pick the niche page that matches a community you already belong to.",
  "Share the /for/ link in 2-3 places that niche actually hangs out (no spam — answer a real complaint about posting).",
  `Watch for ${SIGNUP_TARGET} signups on one niche — that's the validation bar worth building toward.`,
  "Email the first signups and ask for a 15-minute call. Ten conversations beat a hundred silent signups.",
  "Double down on the niche that converts; retire the pages that don't.",
];

export default async function ValidationPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const stats: WaitlistStats | null = isConvexConfigured()
    ? await getConvexClient().query(convexApi.waitlist.stats, {})
    : null;

  const countsByNiche = stats?.countsByNiche ?? {};
  const total = stats?.total ?? 0;
  const recent = stats?.recent ?? [];

  return (
    <AppShell>
      <div className="grid gap-6">
        <div className="space-y-3">
          <span className="eyebrow-chip">Validation</span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Which niche is <span className="text-gradient">pulling?</span>
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-400">
            {total} waitlist signup{total === 1 ? "" : "s"} so far. The bar that
            matters: {SIGNUP_TARGET} signups in one niche before going all-in on it.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {niches.map((niche) => {
            const count = countsByNiche[niche.slug] ?? 0;
            const percent = Math.min(100, Math.round((count / SIGNUP_TARGET) * 100));
            const validated = count >= SIGNUP_TARGET;

            return (
              <article key={niche.slug} className="studio-panel p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{niche.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{niche.audience}</p>
                  </div>
                  {validated ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-xs font-bold text-emerald-100">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Validated
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs font-semibold text-slate-300">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {count}/{SIGNUP_TARGET}
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8dff5a] to-[#2bd6ff]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {count} signup{count === 1 ? "" : "s"} · {percent}% of the validation bar
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={`/for/${niche.slug}`}
                    className="flex items-center gap-1.5 font-semibold text-cyan-200 transition-colors hover:text-white"
                  >
                    Open landing page
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">
                    Share in: {niche.communities.join(", ")}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <article className="studio-panel p-6">
            <h2 className="text-lg font-bold text-white">Recent signups</h2>
            {recent.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-400">
                No signups yet. Share a niche landing page link where that niche
                hangs out, then watch this list.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {recent.map((signup) => (
                  <li
                    key={signup.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-white">{signup.email}</span>
                    <span className="text-slate-400">
                      {signup.niche}
                      {signup.source ? ` · ${signup.source}` : ""} ·{" "}
                      {new Date(signup.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="studio-panel p-6">
            <h2 className="text-lg font-bold text-white">The playbook</h2>
            <ul className="mt-4 grid gap-3">
              {playbook.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-slate-300">
                  <Circle className="mt-1 h-3.5 w-3.5 shrink-0 text-[#9cff6d]" aria-hidden="true" />
                  <span>
                    <span className="font-semibold text-white">Step {index + 1}.</span> {step}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </AppShell>
  );
}
