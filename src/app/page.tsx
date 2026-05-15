import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Play,
  RadioTower,
  Shield,
  ShieldCheck,
  Unplug,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { pricingPlans } from "@/lib/billing/pricing";

const platformNodes = [
  { name: "TikTok", accent: "border-cyan-400/40 text-cyan-200", dot: "bg-cyan-300" },
  { name: "YouTube Shorts", accent: "border-rose-400/40 text-rose-200", dot: "bg-rose-300" },
  { name: "Instagram Reels", accent: "border-fuchsia-400/40 text-fuchsia-200", dot: "bg-fuchsia-300" },
];

const trustCards = [
  {
    title: "Encrypted tokens",
    description: "Connected account tokens are encrypted before storage.",
    icon: LockKeyhole,
  },
  {
    title: "Scoped access",
    description: "Customers connect only the accounts their workspace needs.",
    icon: Shield,
  },
  {
    title: "Revoke anytime",
    description: "Disconnect platform access whenever a channel changes.",
    icon: KeyRound,
  },
];

const statusRows = [
  {
    post: "Launch clip",
    date: "May 16, 2026",
    time: "9:00 AM",
    platforms: ["TikTok", "YouTube", "Reels"],
    status: "Scheduled",
  },
  {
    post: "Studio walkthrough",
    date: "May 16, 2026",
    time: "1:00 PM",
    platforms: ["YouTube", "Reels"],
    status: "Ready",
  },
  {
    post: "Behind the scenes",
    date: "May 17, 2026",
    time: "10:30 AM",
    platforms: ["TikTok", "YouTube", "Reels"],
    status: "Queued",
  },
];

const workflow = [
  {
    title: "Upload once",
    description: "Add a vertical MP4 or MOV and keep the source file tied to one workspace.",
    icon: Workflow,
  },
  {
    title: "Connect securely",
    description: "Customers connect their own platform accounts with encrypted token storage.",
    icon: ShieldCheck,
  },
  {
    title: "Schedule with control",
    description: "Choose the publish time, track platform status, and retry failed posts.",
    icon: CalendarClock,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#03080b] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.06)_1px,transparent_1px)] bg-[size:56px_56px]" />
        <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-cyan-400/10 to-transparent" />

        <header className="relative z-10">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
            <Link href="/" className="flex items-center gap-3 text-sm font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>Aegis Relay</span>
            </Link>
            <div className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
              <a href="#features" className="hover:text-white">
                Features
              </a>
              <a href="#pricing" className="hover:text-white">
                Pricing
              </a>
              <Link href="/privacy" className="hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms
              </Link>
              <Link href="/sign-in" className="hover:text-white">
                Sign in
              </Link>
            </div>
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center justify-center rounded-md bg-cyan-200 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-white"
            >
              Start scheduling
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-center lg:pb-24 lg:pt-20">
          <div className="max-w-3xl space-y-8">
            <div className="flex w-fit items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-cyan-100">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Secure short-form scheduling
            </div>
            <div className="space-y-5">
              <h1 className="text-5xl font-semibold leading-tight tracking-normal text-white sm:text-6xl lg:text-7xl">
                Schedule one video across every short-form channel.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Aegis Relay gives creators and agencies one controlled workflow
                to upload, schedule, and monitor posts across TikTok, YouTube
                Shorts, and Instagram Reels.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-200 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-white"
              >
                Start scheduling
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#workflow"
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/15 bg-white/[0.03] px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                See how it works
              </Link>
            </div>
            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                Encrypted by default
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                No auto-posting surprises
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                Workspace-level control
              </div>
            </div>
          </div>

          <RelayGraphic />
        </div>
      </section>

      <section id="features" className="border-b border-white/10 bg-[#061015]">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-3 text-center">
            <h2 className="text-3xl font-semibold tracking-normal text-white">
              Secure connections. Your data stays yours.
            </h2>
            <p className="text-base leading-7 text-slate-300">
              Aegis Relay is designed for customer-connected accounts, encrypted
              publishing credentials, and visible platform status.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {trustCards.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/20"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-white/10 bg-[#03080b]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-start">
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-normal text-white">
                Everything in one place.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Schedule, customize, and track every post across platforms from
                one operational view built for repeat publishing.
              </p>
            </div>
            <div className="grid gap-4">
              {workflow.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-cyan-100">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      <section id="pricing" className="border-b border-white/10 bg-[#061015]">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-normal text-white">
              Pricing for steady short-form output.
            </h2>
            <p className="text-base leading-7 text-slate-300">
              Start in beta, then upgrade when you are ready to schedule repeat
              publishing across connected customer accounts.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                className={
                  plan.featured
                    ? "rounded-md border border-cyan-300/35 bg-cyan-300/[0.055] p-6 shadow-2xl shadow-cyan-950/20"
                    : "rounded-md border border-white/10 bg-white/[0.035] p-6"
                }
                key={plan.id}
              >
                <p className="text-xs font-semibold uppercase text-cyan-200">
                  {plan.eyebrow}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{plan.name}</h3>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-4xl font-semibold text-white">{plan.price}</span>
                  <span className="pb-1 text-sm text-slate-400">{plan.period}</span>
                </div>
                <p className="mt-4 min-h-16 text-sm leading-6 text-slate-300">
                  {plan.description}
                </p>
                <ul className="mt-5 grid gap-2 text-sm text-slate-200">
                  {plan.features.slice(0, 4).map((feature) => (
                    <li className="flex gap-2" key={feature}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className={
                    plan.id === "beta"
                      ? "mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-white/15 bg-white/[0.03] px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                      : "mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-cyan-200 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-white"
                  }
                  href={plan.id === "beta" ? "/sign-in" : "/billing"}
                >
                  {plan.id === "beta" ? "Start free" : plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#061015]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm space-y-3">
            <div className="flex items-center gap-3 text-sm font-semibold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                <Shield className="h-4 w-4" aria-hidden="true" />
              </span>
              Aegis Relay
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Secure short-form scheduling for creators, agencies, and customer
              workspaces.
            </p>
          </div>
          <div className="grid gap-8 text-sm sm:grid-cols-3">
            <div className="space-y-3">
              <p className="font-semibold text-white">Product</p>
              <a href="#features" className="block text-slate-400 hover:text-white">
                Features
              </a>
              <a href="#pricing" className="block text-slate-400 hover:text-white">
                Pricing
              </a>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-white">Legal</p>
              <Link href="/privacy" className="block text-slate-400 hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-slate-400 hover:text-white">
                Terms of Service
              </Link>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-white">Access</p>
              <Link href="/sign-in" className="block text-slate-400 hover:text-white">
                Sign in
              </Link>
              <Link href="/support" className="block text-slate-400 hover:text-white">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

function RelayGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-xl rounded-md border border-white/10 bg-[#061015]/90 p-5 shadow-2xl shadow-cyan-950/30">
      <div className="absolute inset-0 rounded-md bg-[linear-gradient(135deg,rgba(34,211,238,0.12),transparent_35%,rgba(217,70,239,0.10))]" />
      <div className="relative grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)_9rem] sm:items-center">
        <div className="space-y-4">
          {platformNodes.map((platform) => (
            <div
              key={platform.name}
              className={`rounded-md border bg-black/20 p-3 ${platform.accent}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${platform.dot}`} />
                <p className="text-sm font-semibold">{platform.name}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative flex min-h-72 items-center justify-center">
          <div className="absolute left-0 right-0 top-1/2 hidden h-px bg-gradient-to-r from-cyan-300/0 via-cyan-200/50 to-fuchsia-300/0 sm:block" />
          <div className="absolute bottom-9 top-9 hidden w-px bg-gradient-to-b from-cyan-300/0 via-fuchsia-200/50 to-cyan-300/0 sm:block" />
          <div className="relative z-10 w-36 rounded-[1.75rem] border border-white/15 bg-slate-950 p-2 shadow-2xl shadow-black/50">
            <div className="rounded-[1.25rem] border border-white/10 bg-gradient-to-b from-slate-700 to-slate-950 p-3">
              <div className="aspect-[9/16] rounded-xl border border-white/10 bg-[linear-gradient(160deg,#e5e7eb,#475569_50%,#020617)] p-3">
                <div className="flex h-full flex-col justify-between">
                  <div className="h-5 w-16 rounded bg-white/20" />
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-950">
                    <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 rounded bg-white/35" />
                    <div className="h-1.5 w-2/3 rounded bg-white/20" />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-cyan-100">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs font-medium">Encrypted</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-emerald-300/30 bg-emerald-300/10 p-4 text-emerald-100">
          <p className="text-sm font-semibold">Scheduled</p>
          <div className="mt-4 space-y-3">
            {platformNodes.map((platform) => (
              <div key={platform.name} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-md border border-white/10 bg-[#071217] p-4 shadow-2xl shadow-black/30">
      <div className="rounded-md border border-white/10 bg-slate-950/70">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Upcoming posts</p>
            <p className="mt-1 text-xs text-slate-400">Workspace publishing queue</p>
          </div>
          <RadioTower className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Post</th>
                <th className="px-4 py-3 font-medium">Date and time</th>
                <th className="px-4 py-3 font-medium">Platforms</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {statusRows.map((row) => (
                <tr key={row.post}>
                  <td className="px-4 py-4 font-medium text-white">{row.post}</td>
                  <td className="px-4 py-4 text-slate-300">
                    {row.date} · {row.time}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5">
                      {row.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300"
                        >
                          {platform}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-xs font-medium text-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 p-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Unplug className="h-4 w-4" aria-hidden="true" />
            Connected accounts are scoped to each workspace.
          </div>
          <Link href="/privacy" className="font-medium text-cyan-100 hover:text-white">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
