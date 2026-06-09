"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CreditCard,
  Images,
  LayoutDashboard,
  Plug,
  Target,
  WandSparkles,
} from "lucide-react";

import { RelaygatorLogo } from "@/components/relaygator-logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/composer", label: "Composer", icon: WandSparkles },
  { href: "/media", label: "Media", icon: Images },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/validation", label: "Validation", icon: Target },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#03100f] text-slate-100">
      {/* Ambient animated background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="aurora-bg opacity-70" />
        <div className="absolute inset-0 grid-overlay opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(43,214,255,0.08),transparent_45%)]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-white/10 bg-[#05130f]/85 px-4 py-5 shadow-2xl shadow-black/50 backdrop-blur-2xl md:flex">
        <Link href="/dashboard" className="rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.04]">
          <RelaygatorLogo subtitle="Publishing Studio" markClassName="h-10 w-10" />
        </Link>

        <nav className="mt-8 flex flex-col gap-1.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-[#8dff5a]/18 to-[#2bd6ff]/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span
                  className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#8dff5a] to-[#2bd6ff] transition-all ${
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  }`}
                />
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    active ? "text-[#9cff6d]" : "text-slate-500 group-hover:text-[#9cff6d]"
                  }`}
                  aria-hidden="true"
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto grid gap-3">
          <div className="gradient-border p-3.5">
            <div className="relative flex items-center gap-2">
              <span className="live-dot" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                Relay status
              </p>
            </div>
            <p className="relative mt-2 text-sm text-slate-400">
              YouTube, TikTok, and Instagram live.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Operator
            </p>
            <UserButton />
          </div>
        </div>
      </aside>

      <div className="relative z-10 md:pl-72">
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#05130f]/85 px-4 backdrop-blur-2xl md:hidden">
          <Link href="/dashboard" className="text-base font-semibold">
            <RelaygatorLogo markClassName="h-9 w-9" />
          </Link>
          <UserButton />
        </header>

        <header className="mx-auto hidden h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:flex lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Studio command
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Plan, queue, and publish short-form drops.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="studio-button-primary" href="/composer">
              <WandSparkles className="h-4 w-4" aria-hidden="true" />
              Create
            </Link>
            <Link
              href="/alerts"
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:border-[#2bd6ff]/40 hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Link>
            <UserButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 md:pt-0 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
