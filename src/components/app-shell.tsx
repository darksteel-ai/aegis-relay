import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CreditCard,
  Images,
  LayoutDashboard,
  Plug,
  WandSparkles,
} from "lucide-react";

import { AegisRelayLogo } from "@/components/aegis-relay-logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/composer", label: "Composer", icon: WandSparkles },
  { href: "/media", label: "Media", icon: Images },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#050608] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(135deg,rgba(255,51,71,0.12)_0,transparent_22%,rgba(34,211,238,0.08)_52%,transparent_78%)] bg-[size:72px_72px,72px_72px,100%_100%]" />
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-[#080a0f]/95 px-4 py-5 shadow-2xl shadow-black/50 backdrop-blur-xl md:flex md:flex-col">
        <Link href="/dashboard" className="rounded-md px-2 py-2">
          <AegisRelayLogo subtitle="Relay Studio" markClassName="h-10 w-10" />
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex h-11 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium text-slate-400 transition-colors hover:border-red-400/20 hover:bg-red-500/10 hover:text-white"
            >
              <Icon
                className="h-4 w-4 text-slate-500 transition-colors group-hover:text-red-300"
                aria-hidden="true"
              />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-3">
          <div className="rounded-md border border-cyan-300/[0.16] bg-cyan-300/[0.04] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-200">
              Relay status
            </p>
            <p className="mt-2 text-sm text-slate-400">YouTube, TikTok, and Instagram live.</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Operator
          </p>
          <UserButton />
          </div>
        </div>
      </aside>
      <div className="relative z-10 md:pl-72">
        <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#090b10]/90 px-4 backdrop-blur-xl md:hidden">
          <Link href="/dashboard" className="text-base font-semibold">
            <AegisRelayLogo markClassName="h-9 w-9" />
          </Link>
          <UserButton />
        </header>
        <header className="mx-auto hidden h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 md:flex lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Studio command
            </p>
            <p className="mt-1 text-sm text-slate-300">Plan, queue, and publish short-form drops.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="studio-button-primary" href="/composer">
              <WandSparkles className="h-4 w-4" aria-hidden="true" />
              Create
            </Link>
            <Link
              href="/alerts"
              className="grid h-10 w-10 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-slate-300"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Link>
            <UserButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-8 sm:px-6 md:pt-0 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
