import { AppShell } from "@/components/app-shell";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <AppShell>
      <div className="space-y-3">
        <p className="text-sm font-medium text-neutral-500">Dashboard</p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Schedule videos across every channel.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-neutral-600">
          {session.user.email
            ? `${session.user.email} is signed in and ready for scheduler flows.`
            : "This workspace is ready for scheduler flows."}
        </p>
      </div>
    </AppShell>
  );
}
