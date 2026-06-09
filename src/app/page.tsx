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
import { niches } from "@/lib/niches";

const heroStats = [
  { label: "Connected platforms", value: "5" },
  { label: "Creator plan posts", value: "150/mo" },
  { label: "Studio plan posts", value: "750/mo" },
];

const marqueeItems = [
  "TikTok",
  "YouTube Shorts",
  "Instagram Reels",
  "Facebook",
  "LinkedIn",
  "Encrypted OAuth",
  "AI captions",
  "Auto-retry",
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
    <main className="min-h-screen bg-[#03100f] text-white">
      <HeroSection />
      <Marquee />
      <OutcomeSection />
      <WorkflowSection />
      <PlatformSection />
      <NicheSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[94vh] overflow-hidden border-b border-white/10">
      <HeroScene />
      <header className="relative z-20">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-sm font-semibold">
            <RelaygatorLogo markClassName="h-10 w-10" />
          </Link>
          <div className="flex items-center gap-5 text-sm font-medium text-slate-300 md:gap-7">
            <a href="#workflow" className="hidden transition-colors hover:text-white md:inline">
              Workflow
            </a>
            <a href="#platforms" className="hidden transition-colors hover:text-white md:inline">
              Platforms
            </a>
            <a href="#niches" className="hidden transition-colors hover:text-white md:inline">
              Niches
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
          </div>
          <Link href="/sign-in" className="studio-button-primary !h-10">
            Start free
          </Link>
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-end px-4 pb-12 pt-16 sm:px-6 lg:min-h-[calc(94vh-5rem)] lg:pb-20">
        <div className="max-w-4xl">
          <div className="animate-fade-up eyebrow-chip mb-6">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Built for short-form operators, creators &amp; agencies
          </div>
          <h1 className="animate-fade-up delay-100 max-w-[46rem] text-5xl font-bold leading-[1.0] tracking-tight text-white sm:text-6xl lg:text-7xl">
            One upload.
            <br />
            One schedule.
            <br />
            <span className="text-gradient">Every channel.</span>
          </h1>
          <p className="animate-fade-up delay-200 mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            Relaygator turns scattered posting work into one secure publishing
            command center for TikTok, YouTube Shorts, and Instagram Reels.
          </p>
          <div className="animate-fade-up delay-300 mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-in" className="studio-button-primary !h-12 px-6 text-base">
              Start scheduling
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="#pricing" className="studio-button-secondary !h-12 px-6 text-base">
              View pricing
            </a>
          </div>
        </div>

        <div className="animate-fade-up delay-500 mt-12 grid max-w-3xl gap-3 sm:grid-cols-3">
          {heroStats.map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-5">
              <p className="text-3xl font-bold text-gradient-static">{stat.value}</p>
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
    <div className="absolute inset-0 overflow-hidden">
      <div className="aurora-bg" />
      <div className="absolute inset-0 grid-overlay" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_12%,rgba(141,255,90,0.18),transparent_34%),radial-gradient(circle_at_12%_22%,rgba(43,214,255,0.16),transparent_36%),linear-gradient(180deg,rgba(3,16,15,0.2),rgba(3,16,15,0.96)_84%)]" />
      <div className="absolute right-[-15rem] top-28 hidden w-[44rem] animate-float opacity-90 lg:block">
        <ProductStage />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-[#03100f] to-transparent" />
    </div>
  );
}

function ProductStage() {
  return (
    <div className="rotate-[-4deg] gradient-border glow-cyan p-5 shadow-2xl shadow-black/50">
      <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Studio command
          </p>
          <p className="mt-1 text-xl font-bold text-white">Publishing queue</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-sm font-semibold text-emerald-100">
          <span className="live-dot" />
          Live
        </div>
      </div>
      <div className="relative grid gap-3 pt-4">
        {[
          ["Commander drop", "TikTok, Shorts, Reels", "Scheduled", "10:30 AM"],
          ["Studio walkthrough", "Shorts, Reels", "Ready", "1:00 PM"],
          ["Launch clip", "TikTok, Shorts", "Queued", "4:15 PM"],
        ].map(([title, channels, status, time]) => (
          <div
            key={title}
            className="grid grid-cols-[1fr_auto] gap-4 rounded-xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-cyan-300/30"
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
      <div className="relative mt-4 grid grid-cols-3 gap-3">
        {["TikTok", "YouTube", "Instagram"].map((platform) => (
          <div
            key={platform}
            className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-3 py-2 text-center text-sm font-semibold text-cyan-100"
          >
            {platform}
          </div>
        ))}
      </div>
    </div>
  );
}

function Marquee() {
  const items = [...marqueeItems, ...marqueeItems];
  return (
    <div className="relative overflow-hidden border-b border-white/10 bg-[#04130f] py-5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#04130f] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#04130f] to-transparent" />
      <div className="flex w-max animate-marquee items-center gap-10">
        {items.map((item, i) => (
          <div key={`${item}-${i}`} className="flex items-center gap-10">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#8dff5a] to-[#2bd6ff]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function OutcomeSection() {
  return (
    <section className="relative border-b border-white/10 bg-[#05140f]">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <span className="eyebrow-chip">The operator advantage</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Replace tab-hopping with a repeatable{" "}
              <span className="text-gradient-static">publishing system.</span>
            </h2>
          </div>
          <p className="text-base leading-7 text-slate-300">
            Relaygator is designed for people who publish more than occasional
            clips. Keep uploads, account access, platform readiness, scheduled
            posts, usage limits, and retry history in one quiet workflow.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {outcomes.map((outcome) => {
            const Icon = outcome.icon;
            return (
              <article
                key={outcome.title}
                className="group studio-panel p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#8dff5a]/20 to-[#2bd6ff]/20 text-cyan-100 ring-1 ring-cyan-300/20 transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-white">{outcome.title}</h3>
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
    <section id="workflow" className="border-b border-white/10 bg-[#03100f]">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:py-24">
        <div className="space-y-5 lg:sticky lg:top-16 lg:self-start">
          <span className="eyebrow-chip">How it works</span>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            A scheduler that acts like an{" "}
            <span className="text-gradient-static">operations desk.</span>
          </h2>
          <p className="max-w-xl text-base leading-7 text-slate-300">
            Every scheduled post is broken into platform-specific jobs, so your
            team can see exactly where each account stands.
          </p>
          <Link href="/sign-in" className="studio-button-secondary">
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
                className="group grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition-all hover:border-[#8dff5a]/30 hover:bg-[#8dff5a]/[0.04]"
              >
                <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-gradient-to-br from-[#8dff5a]/20 to-[#2bd6ff]/15 p-3 text-[#9cff6d] ring-1 ring-[#8dff5a]/15 transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8eea57]">
                    {item.eyebrow}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-white">{item.title}</h3>
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
    <section id="platforms" className="border-b border-white/10 bg-[#05140f]">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start lg:py-24">
        <div>
          <span className="eyebrow-chip">Platform-ready</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built around the details platforms{" "}
            <span className="text-gradient-static">actually review.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
            Relaygator keeps platform settings visible before posting: TikTok
            privacy and music usage confirmation, YouTube title and description,
            Instagram professional account publishing, and account health checks.
          </p>
          <div className="mt-8 grid gap-3">
            {platformFeatures.map((feature) => (
              <div className="flex items-start gap-3 text-sm leading-6 text-slate-200" key={feature}>
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="gradient-border p-6">
          <div className="relative grid gap-3">
            <PlatformRow name="TikTok" status="Creator settings required" tone="cyan" />
            <PlatformRow name="YouTube Shorts" status="Auto-publish ready" tone="green" />
            <PlatformRow name="Instagram Reels" status="Professional account" tone="navy" />
          </div>
          <div className="relative mt-5 flex gap-3 rounded-xl border border-emerald-300/25 bg-emerald-300/[0.08] p-4 text-sm leading-6 text-emerald-100">
            <BadgeCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
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
    cyan: "border-cyan-300/25 bg-cyan-300/[0.06]",
    green: "border-[#7ed957]/30 bg-[#7ed957]/[0.08]",
    navy: "border-[#30d5ff]/20 bg-[#0b2530]",
  };

  return (
    <div className={`rounded-xl border p-4 transition-transform hover:-translate-y-0.5 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold text-white">{name}</p>
        <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-slate-200">
          {status}
        </span>
      </div>
    </div>
  );
}

function NicheSection() {
  return (
    <section id="niches" className="border-b border-white/10 bg-[#03100f]">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-3xl">
          <span className="eyebrow-chip">Built for your niche</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            See how Relaygator fits{" "}
            <span className="text-gradient-static">your kind of content.</span>
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {niches.map((niche) => (
            <Link
              key={niche.slug}
              href={`/for/${niche.slug}`}
              className="group studio-panel p-6 transition-all hover:border-[#8dff5a]/30"
            >
              <h3 className="text-base font-bold text-white">{niche.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{niche.audience}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-200 transition-colors group-hover:text-white">
                See the workflow
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="border-b border-white/10 bg-[#03100f]">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="max-w-3xl">
          <span className="eyebrow-chip">Pricing</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start lean. Scale when posting{" "}
            <span className="text-gradient-static">volume grows.</span>
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-300">
            Plans are tied to scheduled post volume so customers can match cost
            to how much content they actually move through the relay.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <article
              className={
                plan.featured
                  ? "group relative gradient-border glow-lime p-7 lg:-translate-y-3"
                  : "group studio-panel p-7"
              }
              key={plan.id}
            >
              <div className="relative flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">
                  {plan.eyebrow}
                </p>
                {plan.featured ? (
                  <span className="rounded-full bg-gradient-to-r from-[#8dff5a] to-[#2bd6ff] px-2.5 py-1 text-xs font-bold text-[#04130f]">
                    Popular
                  </span>
                ) : null}
              </div>
              <h3 className="relative mt-3 text-2xl font-bold text-white">{plan.name}</h3>
              <div className="relative mt-5 flex items-end gap-2">
                <span className="text-5xl font-bold text-white">{plan.price}</span>
                <span className="pb-1.5 text-sm text-slate-400">{plan.period}</span>
              </div>
              <p className="relative mt-4 min-h-16 text-sm leading-6 text-slate-300">
                {plan.description}
              </p>
              <div className="relative mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white">
                <CircleDollarSign className="h-4 w-4 text-[#8eea57]" aria-hidden="true" />
                {plan.monthlyScheduledPostLimit} scheduled posts per month
              </div>
              <ul className="relative mt-5 grid gap-2.5 text-sm text-slate-200">
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
                    ? "studio-button-primary relative mt-7 w-full"
                    : "studio-button-secondary relative mt-7 w-full"
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
    <section className="border-b border-white/10 bg-[#05140f]">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:py-24">
        <div>
          <span className="eyebrow-chip">Questions</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
            Built for the practical parts of publishing.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {faqs.map((faq) => (
            <article
              key={faq.question}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition-all hover:border-cyan-300/25 hover:bg-white/[0.05]"
            >
              <h3 className="text-base font-bold text-white">{faq.question}</h3>
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
    <section className="bg-[#03100f]">
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-[#8dff5a]/20 bg-[#06181a] p-8 sm:p-12">
          <div className="aurora-bg opacity-80" />
          <div className="absolute inset-0 grid-overlay opacity-50" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <span className="eyebrow-chip">Ready when the queue is</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Build your short-form{" "}
                <span className="text-gradient">publishing command center.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Start with free beta access, connect your first account, and
                schedule your first video through Relaygator.
              </p>
            </div>
            <Link href="/sign-in" className="studio-button-primary !h-13 px-7 text-base">
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
    <footer className="border-t border-white/10 bg-[#05140f]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm space-y-3">
          <RelaygatorLogo markClassName="h-9 w-9" />
          <p className="text-sm leading-6 text-slate-400">
            Secure short-form scheduling for creators, agencies, and customer
            workspaces.
          </p>
        </div>
        <div className="grid gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <p className="font-bold text-white">Product</p>
            <a href="#workflow" className="block text-slate-400 transition-colors hover:text-white">
              Workflow
            </a>
            <a href="#platforms" className="block text-slate-400 transition-colors hover:text-white">
              Platforms
            </a>
            <a href="#pricing" className="block text-slate-400 transition-colors hover:text-white">
              Pricing
            </a>
          </div>
          <div className="space-y-3">
            <p className="font-bold text-white">Who it&apos;s for</p>
            {niches.map((niche) => (
              <Link
                key={niche.slug}
                href={`/for/${niche.slug}`}
                className="block text-slate-400 transition-colors hover:text-white"
              >
                {niche.name}
              </Link>
            ))}
          </div>
          <div className="space-y-3">
            <p className="font-bold text-white">Legal</p>
            <Link href="/privacy" className="block text-slate-400 transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="block text-slate-400 transition-colors hover:text-white">
              Terms of Service
            </Link>
          </div>
          <div className="space-y-3">
            <p className="font-bold text-white">Access</p>
            <Link href="/sign-in" className="block text-slate-400 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link href="/support" className="block text-slate-400 transition-colors hover:text-white">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
