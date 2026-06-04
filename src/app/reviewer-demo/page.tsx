import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reviewer Demo | Relaygator",
  description: "Reviewer walkthrough for the Relaygator beta.",
};

export const reviewerDemoSteps = [
  "Sign in with the reviewer account or magic-link email provided for the beta review.",
  "Open Connections and connect a YouTube channel so the workspace has YouTube upload permission.",
  "Open Composer and upload a short vertical video that meets the beta file rules.",
  "Enter a caption, select YouTube Shorts as the platform, choose a future schedule time, and create the scheduled post.",
  "Open Calendar or Dashboard to find the scheduled post and then open the post detail page.",
  "Inspect each platform post status, any last error, the platform ID or URL when available, and the retry control for failed or blocked attempts.",
];

export default function ReviewerDemoPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="space-y-3">
          <p className="text-sm font-medium text-neutral-500">
            Reviewer walkthrough
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Reviewer Demo
          </h1>
          <p className="text-base leading-7 text-neutral-600">
            Follow these steps to review the beta scheduler without needing
            private product context. TikTok and Instagram Reels are approval
            pending in this beta; YouTube Shorts is the active connection and
            publishing flow.
          </p>
        </header>

        <section className="mt-8 rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Demo Steps
          </h2>
          <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-neutral-700">
            {reviewerDemoSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-700 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Quick Links
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              ["Sign in", "/sign-in"],
              ["Connections", "/connections"],
              ["Composer", "/composer"],
              ["Calendar", "/calendar"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
