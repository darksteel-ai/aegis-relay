import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileVideo,
  KeyRound,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { RelaygatorLogo } from "@/components/relaygator-logo";
import { pricingPlans } from "@/lib/billing/pricing";

const heroStats = [
  { label: "Connected platforms", value: "4" },
  { label: "Creator plan posts", value: "150/mo" },
  { label: "Studio plan posts", value: "750/mo" },
];

const outcomes = [
  {
    title: "Stop rebuilding the same post",
    description:
      "Upload once, select the accounts, tune the metadata, and schedule the same short-form video across the channels that matter.",
    icon: UploadCloud,
  },
  {
    title: "Keep every account owner in control",
    description:
      "Customers connect their own YouTube, TikTok, and Instagram accounts through OAuth, with encrypted credentials and disconnect controls.",
    icon: ShieldCheck,
  },
  {
    title: "Know what happened after publish",
    description:
      "Track queued, published, failed, and retryable posts with plain-English platform status instead of vague background jobs.",
    icon: RadioTower,
  },
];

const workflow = [
  {
    eyebrow: "01",
    title: "Connect accounts",
    description:
      "Each workspace connects its own TikTok, YouTube Shorts, and Instagram Reels accounts.",
    icon: KeyRound,
  },
  {
    eyebrow: "02",
    title: "Prepare the short",
    description:
      "Upload a vertical video, add caption copy, title options, hashtags, and platform-specific settings.",
    icon: FileVideo,
  },
  {
    eyebrow: "03",
    title: "Schedule once",
    description:
      "Choose the time zone and schedule time. Relaygator queues each selected account automatically.",
    icon: CalendarClock,
  },
  {
    eyebrow: "04",
    title: "Monitor and retry",
    description:
      "See publish status by platform, retry failures, and reconnect accounts when access changes.",
    icon: RefreshCw,
  },
];

const platformFeatures = [
  "YouTube Shorts auto-publishing with title and description support",
  "TikTok creator settings, privacy choice, interaction controls, and music usage confirmation",
  "Instagram Reels publishing through connected professional accounts",
  "AI-assisted titles and hashtags using connected platform context",
];

const faqs = [
  {
    question: "Can customers connect their own accounts?",
    answer:
      "Yes. Relaygator is built around customer-connected OAuth accounts, so each workspace can connect and manage its own publishing channels.",
  },
  {
    question: "Does it publish to TikTok automatically?",
    answer:
      "The app supports TikTok Direct Post flows, including required TikTok UX controls. Public Direct Post access depends on TikTok approval.",
  },
  {
    question: "What happens when a platform fails?",
    answer:
      "Failed posts show a readable status message, and retryable posts can be retried after the account or platform issue is fixed.",
  },
  {
    question: "Are tokens stored securely?",
    answer:
      "Connected account tokens are encrypted before storage and can be revoked by disconnecting the account from the workspace.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#04100f] text-white">
      <HeroSection />
      <OutcomeSection />
      <WorkflowSection />
      <PlatformSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden border-b border-white/10">
      <HeroScene />
      <header className="relative z-20">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-sm font-semibold">
            <RelaygatorLogo markClassName="h-10 w-10" />
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
            <a href="#workflow" className="hover:text-white">
              Workflow
            </a>
            <a href="#platforms" className="hover:text-white">
              Platforms
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
          </div>
          <Link
            href="/sign-in"
            className="inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-r from-[#7ed957] to-[#30d5ff] px-4 text-sm font-semibold text-[#04100f] shadow-lg shadow-green-950/30 transition hover:brightness-110"
          >
            Start free
          </Link>
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pb-10 pt-16 sm:px-6 lg:min-h-[calc(92vh-5rem)] lg:pb-16">
        <div className="max-w-4xl">
          <div className="mb-5 flex w-fit items-center gap-2 rounded-md border border-white/10 bg-black/35 px-3 py-1.5 text-sm font-medium text-cyan-100 backdrop-blur">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Built for short-form operators, creators, and agencies
          </div>
          <h1 className="max-w-[43rem] text-5xl font-semibold leading-[1.02] tracking-normal text-white sm:text-6xl lg:text-6xl">
            One upload. One schedule. Every short-form channel.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            Relaygator turns scattered posting work into one secure publishing
            command center for TikTok, YouTube Shorts, and Instagram Reels.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sign-in"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#7ed957] to-[#30d5ff] px-5 text-sm font-semibold text-[#04100f] shadow-xl shadow-green-950/30 transition hover:brightness-110"
            >
              Start scheduling
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/10"
            >
              View pricing
            </a>
          </div>
        </div>

        <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
          {heroStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-md border border-white/10 bg-black/35 p-4 backdrop-blur"
            >
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroScene() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(48,213,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(126,217,87,0.055)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_12%,rgba(126,217,87,0.24),transparent_30%),radial-gradient(circle_at_15%_18%,rgba(48,213,255,0.22),transparent_32%),linear-gradient(180deg,rgba(4,16,15,0.28),rgba(4,16,15,0.96)_82%)]" />
      <div className="absolute right-[-16rem] top-24 hidden w-[44rem] opacity-80 lg:block">
        <ProductStage />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#04100f] to-transparent" />
    </div>
  );
}

function ProductStage() {
  return (
    <div className="rotate-[-4deg] rounded-md border border-[#30d5ff]/15 bg-[#07171b]/90 p-4 shadow-2xl shadow-black/40">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Studio command
          </p>
          <p className="mt-1 text-xl font-semibold text-white">Publishing queue</p>
        </div>
        <div className="rounded-md border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-sm font-semibold text-emerald-100">
          Live
        </div>
      </div>
      <div className="grid gap-4 pt-4">
        {[
          ["Commander drop", "TikTok, Shorts, Reels", "Scheduled", "10:30 AM"],
          ["Studio walkthrough", "Shorts, Reels", "Ready", "1:00 PM"],
          ["Launch clip", "TikTok, Shorts", "Queued", "4:15 PM"],
        ].map(([title, channels, status, time]) => (
          <div
            key={title}
            className="grid grid-cols-[1fr_auto] gap-4 rounded-md border border-white/10 bg-black/25 p-4"
          >
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm text-slate-400">{channels}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-cyan-100">{status}</p>
              <p className="mt-1 text-xs text-slate-500">{time}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {["TikTok", "YouTube", "Instagram"].map((platform) => (
          <div
            key={platform}
            className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-2 text-sm font-semibold text-cyan-100"
          >
            {platform}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutcomeSection() {
  return (
    <section className="border-b border-white/10 bg-[#061514]">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
              The operator advantage
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
              Replace tab-hopping with a repeatable publishing system.
            </h2>
          </div>
          <p className="text-base leading-7 text-slate-300">
            Relaygator is designed for people who publish more than occasional
            clips. Keep uploads, account access, platform readiness, scheduled
            posts, usage limits, and retry history in one quiet workflow.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {outcomes.map((outcome) => {
            const Icon = outcome.icon;
            return (
              <article
                key={outcome.title}
                className="rounded-md border border-white/10 bg-white/[0.035] p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{outcome.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{outcome.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="border-b border-white/10 bg-[#04100f]">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:py-20">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8eea57]">
            How it works
          </p>
          <h2 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
            A scheduler that acts like an operations desk.
          </h2>
          <p className="max-w-xl text-base leading-7 text-slate-300">
            Every scheduled post is broken into platform-specific jobs, so your
            team can see exactly where each account stands.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/[0.06] px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Open the app
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-4">
          {workflow.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 rounded-md border border-white/10 bg-white/[0.035] p-5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#7ed957]/15 text-[#9cff6d]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section id="platforms" className="border-b border-white/10 bg-[#061819]">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start lg:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Platform-ready
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
            Built around the details platforms actually review.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Relaygator keeps platform settings visible before posting: TikTok
            privacy and music usage confirmation, YouTube title and description,
            Instagram professional account publishing, and account health checks.
          </p>
          <div className="mt-7 grid gap-3">
            {platformFeatures.map((feature) => (
              <div className="flex items-start gap-3 text-sm leading-6 text-slate-200" key={feature}>
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-[#7ed957]/15 bg-[#04100f] p-5">
          <div className="grid gap-3">
            <PlatformRow name="TikTok" status="Creator settings required" tone="cyan" />
            <PlatformRow name="YouTube Shorts" status="Auto-publish ready" tone="green" />
            <PlatformRow name="Instagram Reels" status="Professional account" tone="navy" />
          </div>
          <div className="mt-5 rounded-md border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-100">
            <BadgeCheck className="mb-3 h-5 w-5" aria-hidden="true" />
            Tokens are encrypted, workspace-scoped, and removable from the
            connection manager.
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformRow({
  name,
  status,
  tone,
}: {
  name: string;
  status: string;
  tone: "cyan" | "green" | "navy";
}) {
  const tones = {
    cyan: "border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-100",
    green: "border-[#7ed957]/30 bg-[#7ed957]/10 text-[#c9ffb8]",
    navy: "border-[#30d5ff]/20 bg-[#0b2530] text-cyan-100",
  };

  return (
    <div className={`rounded-md border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-white">{name}</p>
        <span className="rounded-md border border-white/10 bg-black/25 px-2 py-1 text-xs">
          {status}
        </span>
      </div>
    </div>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="border-b border-white/10 bg-[#04100f]">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8eea57]">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
            Start lean. Scale when posting volume grows.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Plans are tied to scheduled post volume so customers can match cost
            to how much content they actually move through the relay.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              className={
                plan.featured
                  ? "rounded-md border border-[#7ed957]/45 bg-[#7ed957]/10 p-6 shadow-2xl shadow-green-950/20"
                  : "rounded-md border border-white/10 bg-white/[0.035] p-6"
              }
              key={plan.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  {plan.eyebrow}
                </p>
                {plan.featured ? (
                  <span className="rounded-md bg-[#7ed957] px-2 py-1 text-xs font-semibold text-[#04100f]">
                    Popular
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{plan.name}</h3>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-semibold text-white">{plan.price}</span>
                <span className="pb-1 text-sm text-slate-400">{plan.period}</span>
              </div>
              <p className="mt-4 min-h-16 text-sm leading-6 text-slate-300">
                {plan.description}
              </p>
              <div className="mt-5 flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white">
                <CircleDollarSign className="h-4 w-4 text-[#8eea57]" aria-hidden="true" />
                {plan.monthlyScheduledPostLimit} scheduled posts per month
              </div>
              <ul className="mt-5 grid gap-2 text-sm text-slate-200">
                {plan.features.map((feature) => (
                  <li className="flex gap-2" key={feature}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                className={
                  plan.featured
                    ? "mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-gradient-to-r from-[#7ed957] to-[#30d5ff] px-4 text-sm font-semibold text-[#04100f] transition hover:brightness-110"
                    : "mt-6 inline-flex h-11 w-full items-center justify-center rounded-md border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
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
  );
}

function FaqSection() {
  return (
    <section className="border-b border-white/10 bg-[#061514]">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Questions
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white">
            Built for the practical parts of publishing.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-md border border-white/10 bg-white/[0.035] p-5">
              <h3 className="text-base font-semibold text-white">{faq.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-[#04100f]">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="relative overflow-hidden rounded-md border border-[#7ed957]/20 bg-[#07171b] p-8 sm:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(48,213,255,0.14),transparent_36%,rgba(126,217,87,0.16))]" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Ready when the queue is
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                Build your short-form publishing command center.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Start with free beta access, connect your first account, and
                schedule your first video through Relaygator.
              </p>
            </div>
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-gradient-to-r from-[#7ed957] to-[#30d5ff] px-5 text-sm font-semibold text-[#04100f] shadow-xl shadow-green-950/30 transition hover:brightness-110"
            >
              Start scheduling
              <Zap className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#061514]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm space-y-3">
          <RelaygatorLogo markClassName="h-9 w-9" />
          <p className="text-sm leading-6 text-slate-400">
            Secure short-form scheduling for creators, agencies, and customer
            workspaces.
          </p>
        </div>
        <div className="grid gap-8 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <p className="font-semibold text-white">Product</p>
            <a href="#workflow" className="block text-slate-400 hover:text-white">
              Workflow
            </a>
            <a href="#platforms" className="block text-slate-400 hover:text-white">
              Platforms
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
  );
}
