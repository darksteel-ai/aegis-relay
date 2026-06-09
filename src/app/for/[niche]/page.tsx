import { CheckCircle2, Megaphone, ShieldCheck, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RelaygatorLogo } from "@/components/relaygator-logo";
import { WaitlistForm } from "@/components/waitlist-form";
import { getNiche, niches } from "@/lib/niches";

type NichePageProps = {
  params: Promise<{
    niche: string;
  }>;
};

export function generateStaticParams() {
  return niches.map((niche) => ({ niche: niche.slug }));
}

export async function generateMetadata({ params }: NichePageProps): Promise<Metadata> {
  const { niche: slug } = await params;
  const niche = getNiche(slug);

  if (!niche) {
    return {};
  }

  return {
    title: `Relaygator for ${niche.name} — ${niche.headline} ${niche.headlineAccent}`,
    description: niche.subhead,
  };
}

const painIcons = [Timer, Megaphone, ShieldCheck];

export default async function NicheLandingPage({ params }: NichePageProps) {
  const { niche: slug } = await params;
  const niche = getNiche(slug);

  if (!niche) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#03100f] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 overflow-hidden">
          <div className="aurora-bg" />
          <div className="absolute inset-0 grid-overlay" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_12%,rgba(141,255,90,0.18),transparent_34%),radial-gradient(circle_at_12%_22%,rgba(43,214,255,0.16),transparent_36%),linear-gradient(180deg,rgba(3,16,15,0.2),rgba(3,16,15,0.96)_84%)]" />
        </div>

        <header className="relative z-20">
          <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
            <Link href="/" className="text-sm font-semibold">
              <RelaygatorLogo markClassName="h-12 w-12" />
            </Link>
            <div className="flex items-center gap-5 text-sm font-medium text-slate-300 md:gap-7">
              <Link href="/#workflow" className="hidden transition-colors hover:text-white md:inline">
                How it works
              </Link>
              <Link href="/#pricing" className="transition-colors hover:text-white">
                Pricing
              </Link>
            </div>
            <Link href="/sign-in" className="studio-button-secondary !h-10">
              Sign in
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:pb-24 lg:pt-20">
          <div className="max-w-3xl">
            <div className="animate-fade-up eyebrow-chip mb-6">{niche.audience}</div>
            <h1 className="animate-fade-up delay-100 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {niche.headline} <span className="text-gradient">{niche.headlineAccent}</span>
            </h1>
            <p className="animate-fade-up delay-200 mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              {niche.subhead}
            </p>
            <div className="animate-fade-up delay-300 mt-8 max-w-xl">
              <WaitlistForm niche={niche.slug} source="niche-hero" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#05140f]">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <span className="eyebrow-chip">Sound familiar?</span>
          <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            The posting problem for {niche.name.toLowerCase()}.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {niche.pains.map((pain, index) => {
              const Icon = painIcons[index % painIcons.length];
              return (
                <article key={pain.title} className="studio-panel p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#8dff5a]/20 to-[#2bd6ff]/20 text-cyan-100 ring-1 ring-cyan-300/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-white">{pain.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{pain.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#03100f]">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="eyebrow-chip">How it works for you</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              One workflow, <span className="text-gradient-static">every platform.</span>
            </h2>
            <div className="mt-8 grid gap-4">
              {niche.workflow.map((step, index) => (
                <article
                  key={step.title}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
                >
                  <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-gradient-to-br from-[#8dff5a]/20 to-[#2bd6ff]/15 text-base font-bold text-[#9cff6d] ring-1 ring-[#8dff5a]/15">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{step.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="lg:pt-16">
            <div className="gradient-border p-6">
              <p className="relative text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Posts that work in this niche
              </p>
              <div className="relative mt-4 grid gap-3">
                {niche.samplePosts.map((post) => (
                  <div
                    key={post}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-200"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span>{post}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#05140f]">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="relative overflow-hidden rounded-3xl border border-[#8dff5a]/20 bg-[#06181a] p-8 sm:p-12">
            <div className="aurora-bg opacity-80" />
            <div className="absolute inset-0 grid-overlay opacity-50" />
            <div className="relative z-10 max-w-2xl">
              <span className="eyebrow-chip">Early access</span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Be one of the first {niche.name.toLowerCase()}{" "}
                <span className="text-gradient">on Relaygator.</span>
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                Early users get free beta access and a direct line to shape the
                product around how {niche.name.toLowerCase()} actually publish.
              </p>
              <div className="mt-7 max-w-xl">
                <WaitlistForm niche={niche.slug} source="niche-footer" buttonLabel="Join the waitlist" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#05140f]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <RelaygatorLogo markClassName="h-10 w-10" />
            <div className="flex flex-wrap gap-6 text-sm text-slate-400">
              {niches
                .filter((other) => other.slug !== niche.slug)
                .map((other) => (
                  <Link
                    key={other.slug}
                    href={`/for/${other.slug}`}
                    className="transition-colors hover:text-white"
                  >
                    For {other.name.toLowerCase()}
                  </Link>
                ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-6 border-t border-white/10 pt-6 text-sm text-slate-500">
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
            <Link href="/support" className="transition-colors hover:text-white">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
