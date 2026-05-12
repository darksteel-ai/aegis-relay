import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Video Scheduler",
  description: "Draft privacy notes for the Video Scheduler beta.",
};

export const privacyStoredData = [
  "Account profile information such as email address, name, sign-in sessions, and workspace membership.",
  "Billing references such as Stripe customer IDs, subscription IDs, plan status, and checkout or portal activity references.",
  "Uploaded video metadata and storage keys, including file name, MIME type, file size, duration, resolution, and object storage location.",
  "Captions, platform selections, schedule times, timezones, post settings, and per-platform publishing statuses.",
  "Connected-platform authorization data, including account IDs, scopes, token expiration, and access or refresh tokens.",
  "Publish attempts, platform response IDs or URLs, status changes, retry history, and error messages returned by platform APIs.",
  "Support and contact data sent to us while troubleshooting beta access, billing, connection, upload, or publishing issues.",
];

export const betaPolicyNotice =
  "Beta policy notice: this page describes the current beta service and should be reviewed by counsel before public launch.";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <DocumentHeader
          eyebrow="Beta policy notice"
          title="Privacy Policy"
          description={betaPolicyNotice}
        />

        <div className="mt-8 space-y-6">
          <PolicySection title="Data We Store">
            <ul className="list-disc space-y-2 pl-5">
              {privacyStoredData.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </PolicySection>

          <PolicySection title="How We Use Data">
            <p>
              We use this data to authenticate users, organize workspaces, accept
              uploads, schedule posts, connect platform accounts, submit publish
              attempts, show status history, support retries, manage billing, and
              respond to support requests.
            </p>
          </PolicySection>

          <PolicySection title="Connected Platform Tokens">
            <p>
              Connected-platform access and refresh tokens are encrypted at the
              application layer before storage using the configured platform token
              encryption key. Tokens are used only to perform requested connection,
              refresh, upload, and publishing operations for the connected
              workspace.
            </p>
          </PolicySection>

          <PolicySection title="Third-Party Services">
            <p>
              The beta depends on services such as authentication email, Stripe,
              object storage, Google and YouTube APIs, and any approved future
              platform APIs. Those providers process data under their own terms
              and privacy practices.
            </p>
          </PolicySection>

          <PolicySection title="Policy Review Status">
            <p>
              The beta service is designed around limited workspace access,
              scheduled publishing, and support for reviewer workflows. Privacy
              terms, retention periods, deletion procedures, subprocessors, and
              regional disclosures should be reviewed by counsel before public
              launch.
            </p>
          </PolicySection>
        </div>
      </div>
    </main>
  );
}

function DocumentHeader({
  eyebrow,
  title,
  description,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>) {
  return (
    <header className="space-y-3">
      <p className="text-sm font-medium text-neutral-500">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
      <p className="text-base leading-7 text-neutral-600">{description}</p>
    </header>
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
    <section className="rounded-md border border-neutral-200 bg-white p-6 text-sm leading-6 text-neutral-700 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
