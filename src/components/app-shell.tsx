import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Plug,
  WandSparkles,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/composer", label: "Composer", icon: WandSparkles },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-200 bg-white px-4 py-6 md:flex md:flex-col">
        <Link href="/dashboard" className="px-3 text-lg font-semibold">
          Aegis Relay
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-3">
          <UserButton />
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 md:hidden">
          <Link href="/dashboard" className="text-base font-semibold">
            Aegis Relay
          </Link>
          <UserButton />
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
