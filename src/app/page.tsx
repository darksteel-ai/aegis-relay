import {
  CalendarClock,
  CheckCircle2,
  FileVideo,
  LockKeyhole,
  PlayCircle,
  RadioTower,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const featureCards = [
  {
    title: "One upload, three destinations",
    description:
      "Prepare one vertical video for TikTok, YouTube Shorts, and Instagram Reels from a single workflow.",
    icon: FileVideo,
  },
  {
    title: "Scheduled publishing",
    description:
      "Choose a publish time, store the post plan, and let Aegis Relay handle the publishing queue.",
    icon: CalendarClock,
  },
  {
    title: "Customer account connections",
    description:
      "Each customer can connect their own supported platform accounts with encrypted token storage.",
    icon: LockKeyhole,
  },
  {
    title: "Publishing visibility",
    description:
      "Track per-platform status, retries, platform IDs, published URLs, and errors from one calendar.",
    icon: RadioTower,
  },
];

const platformRows = [
  { name: "YouTube Shorts", status: "Publishing path active" },
  { name: "TikTok", status: "Prepared for app approval" },
  { name: "Instagram Reels", status: "Prepared for app approval" },
];

const workflowSteps = [
  "Upload a vertical MP4 or MOV.",
  "Write the caption and pick platforms.",
  "Schedule the post for a future time.",
  "Review publishing status after the queue runs.",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <header className="border-b border-neutral-200 bg-white">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-950 text-white">
              AR
            </span>
            Aegis Relay
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link href="/privacy" className="hidden text-neutral-600 hover:text-neutral-950 sm:inline">
              Privacy
            </Link>
            <Link href="/terms" className="hidden text-neutral-600 hover:text-neutral-950 sm:inline">
              Terms
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center justify-center rounded-md bg-neutral-950 px-4 text-white transition-colors hover:bg-neutral-800"
            >
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <section className="border-b border-neutral-200">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center lg:py-20">
          <div className="max-w-3xl space-y-7">
            <div className="flex w-fit items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Short-form scheduling SaaS
            </div>
            <div className="space-y-5">
              <h1 className="text-5xl font-semibold leading-tight tracking-normal sm:text-6xl">
                Schedule one video across every short-form channel.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-neutral-600">
                Aegis Relay helps creators and teams upload a vertical video,
                prepare platform-specific posts, and schedule publishing across
                TikTok, YouTube Shorts, and Instagram Reels.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center justify-center rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
              >
                Start scheduling
              </Link>
              <Link
                href="/connections"
                className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 px-5 text-sm font-semibold text-neutral-900 transition-colors hover:bg-neutral-100"
              >
                View connections
              </Link>
            </div>
          </div>

          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
            <div className="rounded-md border border-neutral-200 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-200 p-4">
                <div>
                  <p className="text-sm font-semibold">Launch clip</p>
                  <p className="mt-1 text-xs text-neutral-500">Scheduled today at 4:30 PM</p>
                </div>
                <PlayCircle className="h-8 w-8 text-neutral-500" aria-hidden="true" />
              </div>
              <div className="space-y-3 p-4">
                {platformRows.map((platform) => (
                  <div
                    key={platform.name}
                    className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{platform.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">{platform.status}</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-3xl font-semibold tracking-normal">Built for paid scheduling workflows</h2>
            <p className="text-base leading-7 text-neutral-600">
              Aegis Relay is structured for a SaaS model with customer workspaces,
              billing, connected accounts, upload reservations, and publish history.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-md border border-neutral-200 bg-white p-6">
                  <Icon className="h-6 w-6 text-neutral-700" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-normal">From upload to status</h2>
            <p className="text-base leading-7 text-neutral-600">
              The core workflow keeps the publishing path simple while still
              giving teams enough visibility to operate with confidence.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {workflowSteps.map((step, index) => (
              <li key={step} className="rounded-md border border-neutral-200 p-5">
                <p className="text-sm font-semibold text-neutral-500">Step {index + 1}</p>
                <p className="mt-2 text-base font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-neutral-950 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-300">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Privacy and terms are available for platform review.
            </div>
            <h2 className="text-3xl font-semibold tracking-normal">
              Ready for creators, agencies, and customer workspaces.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/privacy"
              className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 px-4 text-sm font-semibold text-white hover:bg-white/10"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-neutral-950 hover:bg-neutral-200"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
