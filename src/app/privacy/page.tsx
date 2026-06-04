import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Relaygator",
  description:
    "Privacy Policy for Relaygator, a short-form video scheduling SaaS for TikTok, YouTube Shorts, and Instagram Reels.",
};

export const privacyStoredData = [
  "Account profile information such as email address, display name, sign-in session data, and workspace membership.",
  "Billing references such as Stripe customer IDs, subscription IDs, plan status, checkout events, and billing portal activity references.",
  "Uploaded video metadata and storage keys, including file name, MIME type, file size, duration, resolution, and object storage location.",
  "Captions, platform selections, schedule times, timezones, post settings, and per-platform publishing statuses.",
  "Connected-platform authorization data, including external account IDs, account names, scopes, token expiration, and encrypted access or refresh tokens.",
  "Publish attempts, platform response IDs or URLs, status changes, retry history, and error messages returned by platform APIs.",
  "Support and contact data sent to Relaygator while troubleshooting account access, billing, platform connections, uploads, or publishing issues.",
];

export const betaPolicyNotice =
  "Beta policy notice: this page describes the current beta service and should be reviewed by counsel before public launch.";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        <DocumentHeader
          title="Relaygator Privacy Policy"
          description="This Privacy Policy explains how Relaygator collects, uses, stores, and protects information when customers use our short-form video scheduling service."
        />

        <div className="mt-8 space-y-6">
          <PolicySection title="Service Covered by This Policy">
            <p>
              This Privacy Policy applies to Relaygator, available at{" "}
              <Link
                href="https://relaygator.com"
                className="font-medium underline underline-offset-2"
              >
                relaygator.com
              </Link>
              , and to related Relaygator pages, APIs, account connection flows,
              upload flows, scheduling tools, billing flows, and support
              interactions.
            </p>
          </PolicySection>

          <PolicySection title="Information Relaygator Stores">
            <ul className="list-disc space-y-2 pl-5">
              {privacyStoredData.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </PolicySection>

          <PolicySection title="How Relaygator Uses Information">
            <p>
              Relaygator uses information to authenticate users, create and
              manage workspaces, process uploads, schedule posts, connect customer
              platform accounts, submit publishing attempts requested by users,
              display publishing status, support retries, manage subscriptions,
              respond to support requests, prevent abuse, and maintain service
              security.
            </p>
          </PolicySection>

          <PolicySection title="Connected Platform Tokens">
            <p>
              Relaygator stores connected-platform access and refresh tokens only
              so the service can perform requested connection, refresh, upload,
              and publishing operations for the connected customer workspace.
              Tokens are encrypted at the application layer before storage using
              the configured platform token encryption key.
            </p>
          </PolicySection>

          <PolicySection title="Third-Party Services">
            <p>
              Relaygator uses third-party providers for authentication,
              database hosting, object storage, payment processing, and platform
              publishing integrations. These providers may include Convex, Stripe,
              S3-compatible object storage, Google and YouTube APIs, and future
              approved TikTok or Meta platform APIs. Those providers process data
              under their own terms and privacy practices.
            </p>
          </PolicySection>

          <PolicySection title="Data Sharing">
            <p>
              Relaygator does not sell personal information. We share data only
              when needed to operate the service, complete user-requested platform
              publishing actions, process payments, comply with legal obligations,
              protect the service, or work with service providers that support
              Relaygator operations.
            </p>
          </PolicySection>

          <PolicySection title="Data Retention and Deletion">
            <p>
              Relaygator keeps account, workspace, upload, scheduling, billing,
              and publishing records for as long as needed to provide the service,
              maintain security, comply with legal obligations, resolve disputes,
              and preserve operational history. Customers may request deletion or
              disconnection of account data by contacting Relaygator support.
            </p>
          </PolicySection>

          <PolicySection title="Contact">
            <p>
              For privacy questions or data requests related to Relaygator,
              contact the Relaygator operator through the support channel listed
              in the app or on the{" "}
              <Link href="/support" className="font-medium underline underline-offset-2">
                support page
              </Link>
              .
            </p>
          </PolicySection>
        </div>
      </div>
    </main>
  );
}

function DocumentHeader({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <header className="space-y-3">
      <Link href="/" className="text-sm font-medium text-neutral-500 hover:text-neutral-950">
        Relaygator
      </Link>
      <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
      <p className="text-base leading-7 text-neutral-600">{description}</p>
      <p className="text-sm text-neutral-500">Last updated: May 13, 2026</p>
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
