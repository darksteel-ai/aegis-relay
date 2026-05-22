import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | Aegis Relay",
  description: "Support and troubleshooting notes for the Aegis Relay beta.",
};

export const failedPostChecklist = [
  "Confirm the scheduled time has passed and the post is not still waiting for the next publishing run.",
  "Open Connections and verify the YouTube channel is connected, current, and using the intended workspace.",
  "Reconnect YouTube if the token is expired, revoked, missing required scopes, or attached to the wrong channel.",
  "Check that the video is vertical, uses a supported file type, and still has a valid storage key.",
  "Inspect the post detail page for platform status, last error, platform ID, published URL, and retry availability.",
  "Use retry only after fixing connection, permission, file, or platform-policy issues.",
];

export const betaSupportContact = "Use the support contact configured in your beta invitation.";
export const betaSupportNotice =
  "Beta policy notice: this page describes the current beta service and should be reviewed by counsel before public launch.";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <header className="space-y-3">
          <p className="text-sm font-medium text-neutral-500">
            Beta support
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">Support</h1>
          <p className="text-base leading-7 text-neutral-600">
            {betaSupportNotice} Use this page for connection, upload,
            scheduling, billing, and publishing-status questions during beta
            review.
          </p>
        </header>

        <section className="mt-8 rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-700 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">Contact</h2>
          <p className="mt-3 font-medium text-neutral-950">{betaSupportContact}</p>
          <p className="mt-2 text-neutral-600">
            The beta support contact covers reviewer access, connection
            questions, failed publishing attempts, and billing help.
          </p>
        </section>

        <section className="mt-6 rounded-md border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Failed Posts or Connection Issues
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-neutral-700">
            {failedPostChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-700 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Platform Approval Status
          </h2>
          <p className="mt-3">
            YouTube Shorts connection and publishing are the active beta path.
            TikTok and Instagram Reels require connected accounts with approved
            publishing permissions before scheduled posts can publish.
          </p>
        </section>
      </div>
    </main>
  );
}
