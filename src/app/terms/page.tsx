import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Video Scheduler",
  description: "Terms for the current Video Scheduler beta service.",
};

export const termsTopics = [
  "Video Scheduler is a beta scheduling tool for uploading one vertical video, preparing platform-specific captions and settings, and scheduling publishing attempts.",
  "Users are responsible for having the right platform permissions, account access, and content rights before uploading or scheduling any video.",
  "Publishing depends on platform APIs and account eligibility. Video Scheduler cannot guarantee that a scheduled post will publish successfully or remain available after publishing.",
  "Subscriptions and payments are handled through Stripe. Beta plan details, renewal timing, cancellations, and invoices should be reviewed in the billing portal when enabled.",
  "Acceptable use prohibits unlawful content, infringement, deceptive activity, spam, platform abuse, attempts to bypass platform review, or interference with the service.",
  "Access may be suspended or terminated for misuse, non-payment, security risk, platform policy conflicts, or beta shutdown.",
];

export const betaTermsNotice =
  "Beta policy notice: this page describes the current beta service and should be reviewed by counsel before public launch.";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="space-y-3">
          <p className="text-sm font-medium text-neutral-500">
            Beta policy notice
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Terms of Service
          </h1>
          <p className="text-base leading-7 text-neutral-600">
            {betaTermsNotice} These terms summarize the operating rules for
            beta scheduler access and are not legal advice.
          </p>
        </header>

        <section className="mt-8 rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Beta Terms Summary
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">
            {termsTopics.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-700 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Platform Dependencies
          </h2>
          <p className="mt-3">
            YouTube Shorts publishing is the first auto-publishing path in this
            beta. TikTok and Instagram Reels publishing are prepared for future
            approval, but may be unavailable or limited until each platform
            approves the application and required permissions.
          </p>
        </section>

        <section className="mt-6 rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-700 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Legal Review Status
          </h2>
          <p className="mt-3">
            Counsel should review warranty disclaimers, limitation of liability,
            dispute terms, data processing language, refund policy, subscription
            notices, and jurisdiction-specific consumer requirements before
            public launch.
          </p>
        </section>
      </div>
    </main>
  );
}
