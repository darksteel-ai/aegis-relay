import { AppShell } from "@/components/app-shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-3">
        <p className="text-sm font-medium text-neutral-500">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Schedule videos across every channel.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-neutral-600">
          This workspace is ready for the scheduler flows, platform
          connections, billing, and automation work planned in later tasks.
        </p>
      </div>
    </AppShell>
  );
}
