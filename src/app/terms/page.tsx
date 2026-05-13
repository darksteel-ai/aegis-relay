import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Aegis Relay",
  description:
    "Terms of Service for Aegis Relay, a short-form video scheduling SaaS for TikTok, YouTube Shorts, and Instagram Reels.",
};

export const termsTopics = [
  "Aegis Relay is a scheduling tool for uploading one vertical video, preparing platform-specific captions and settings, and scheduling publishing attempts.",
  "Users are responsible for having the required platform permissions, account access, and content rights before uploading or scheduling any video through Aegis Relay.",
  "Publishing depends on platform APIs, app approvals, account permissions, content rules, and account eligibility. Aegis Relay cannot guarantee that a scheduled post will publish successfully or remain available after publishing.",
  "Subscriptions and payments for Aegis Relay are handled through Stripe. Plan details, renewal timing, cancellations, receipts, and invoices should be reviewed through the billing portal when enabled.",
  "Acceptable use prohibits unlawful content, infringement, deceptive activity, spam, platform abuse, attempts to bypass platform review, unauthorized account access, or interference with Aegis Relay.",
  "Access to Aegis Relay may be suspended or terminated for misuse, non-payment, security risk, platform policy conflicts, legal risk, or shutdown of the beta service.",
];

export const betaTermsNotice =
  "Beta policy notice: this page describes the current beta service and should be reviewed by counsel before public launch.";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="space-y-3">
          <Link href="/" className="text-sm font-medium text-neutral-500 hover:text-neutral-950">
            Aegis Relay
          </Link>
          <h1 className="text-3xl font-semibold tracking-normal">
            Aegis Relay Terms of Service
          </h1>
          <p className="text-base leading-7 text-neutral-600">
            These Terms of Service explain the rules for using Aegis Relay, a
            short-form video scheduling service for customer workspaces and
            connected social platform accounts.
          </p>
          <p className="text-sm text-neutral-500">Last updated: May 13, 2026</p>
        </header>

        <section className="mt-8 rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Use of Aegis Relay
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">
            {termsTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </section>

        <PolicySection title="Customer Accounts and Responsibility">
          <p>
            You are responsible for maintaining access to your Aegis Relay
            account, keeping connected platform accounts authorized, and ensuring
            that all videos, captions, schedules, and publishing requests comply
            with applicable laws, third-party platform policies, and any
            agreements that apply to your social accounts.
          </p>
        </PolicySection>

        <PolicySection title="Platform Dependencies">
          <p>
            Aegis Relay supports workflows for TikTok, YouTube Shorts, and
            Instagram Reels. YouTube Shorts publishing is the first
            auto-publishing path in the beta service. TikTok and Instagram Reels
            publishing may be unavailable or limited until each platform approves
            the Aegis Relay application and required permissions.
          </p>
        </PolicySection>

        <PolicySection title="Payments and Subscriptions">
          <p>
            Paid Aegis Relay plans are billed through Stripe. By starting a paid
            plan, you authorize charges for the selected subscription. Unless a
            separate written agreement says otherwise, fees are non-refundable
            except where required by law or explicitly stated in the Stripe
            checkout or billing portal.
          </p>
        </PolicySection>

        <PolicySection title="Service Availability">
          <p>
            Aegis Relay may change, pause, or discontinue features as the product
            develops, especially while platform review and beta access are in
            progress. We may also delay, block, or retry publishing attempts when
            required by platform behavior, missing permissions, technical errors,
            abuse prevention, or security concerns.
          </p>
        </PolicySection>

        <PolicySection title="Privacy">
          <p>
            The Aegis Relay{" "}
            <Link href="/privacy" className="font-medium underline underline-offset-2">
              Privacy Policy
            </Link>{" "}
            explains how we collect, use, store, and protect information related
            to accounts, workspaces, uploads, connected platforms, billing, and
            publishing activity.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            For questions about these Terms of Service, contact the Aegis Relay
            operator through the support channel listed in the app or on the{" "}
            <Link href="/support" className="font-medium underline underline-offset-2">
              support page
            </Link>
            .
          </p>
        </PolicySection>
      </div>
    </main>
  );
}

function PolicySection({
  title,
  children,
}: Readonly<{
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="mt-6 rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-700 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
