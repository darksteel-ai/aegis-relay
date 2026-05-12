# Video Scheduler SaaS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first paid beta of a SaaS that lets customers upload one vertical video, customize it for TikTok, YouTube Shorts, and Instagram Reels, and schedule publishing, with YouTube Shorts auto-publishing first.

**Architecture:** Build a Next.js app with a Postgres-backed domain model, Stripe billing, object storage for video uploads, and a background publishing worker. Platform integrations are isolated behind adapters so YouTube can go live first while TikTok and Instagram remain approval-ready.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Prisma, Postgres, Auth.js, Stripe, S3-compatible object storage, Inngest or Trigger.dev for scheduled jobs, Google OAuth/YouTube Data API v3.

---

## Scope

This plan creates the first testable paid beta. It intentionally does not include AI generation, analytics, teams, CSV bulk scheduling, comments/inbox, or native video editing.

If the repo does not exist yet, create it in the current workspace root. If a repo already exists when execution starts, adapt paths to the existing app structure and preserve current user changes.

## File Structure

- `package.json`: scripts and dependencies.
- `.env.example`: required environment variables.
- `prisma/schema.prisma`: database schema.
- `src/app/layout.tsx`: app shell.
- `src/app/page.tsx`: redirect or marketing-lite entry to dashboard.
- `src/app/(auth)/sign-in/page.tsx`: sign-in screen.
- `src/app/(app)/dashboard/page.tsx`: dashboard.
- `src/app/(app)/composer/page.tsx`: create scheduled post.
- `src/app/(app)/calendar/page.tsx`: calendar list.
- `src/app/(app)/connections/page.tsx`: platform connections.
- `src/app/(app)/billing/page.tsx`: subscription management.
- `src/app/(app)/posts/[postId]/page.tsx`: post detail and publish status.
- `src/app/api/uploads/presign/route.ts`: signed upload URLs.
- `src/app/api/posts/route.ts`: create and list scheduled posts.
- `src/app/api/posts/[postId]/retry/route.ts`: retry failed platform publish.
- `src/app/api/stripe/checkout/route.ts`: create checkout session.
- `src/app/api/stripe/portal/route.ts`: create billing portal session.
- `src/app/api/webhooks/stripe/route.ts`: Stripe webhook.
- `src/app/api/auth/[...nextauth]/route.ts`: Auth.js route.
- `src/app/api/oauth/youtube/start/route.ts`: start YouTube OAuth.
- `src/app/api/oauth/youtube/callback/route.ts`: handle YouTube OAuth callback.
- `src/components/app-shell.tsx`: navigation and page frame.
- `src/components/status-badge.tsx`: consistent status display.
- `src/components/video-upload.tsx`: upload widget.
- `src/components/platform-selector.tsx`: platform selection and platform settings.
- `src/lib/auth.ts`: Auth.js config.
- `src/lib/db.ts`: Prisma client.
- `src/lib/env.ts`: environment validation.
- `src/lib/storage.ts`: signed upload helpers.
- `src/lib/billing/stripe.ts`: Stripe helpers.
- `src/lib/platforms/types.ts`: platform adapter interface.
- `src/lib/platforms/youtube.ts`: YouTube adapter.
- `src/lib/platforms/tiktok.ts`: TikTok approval-pending adapter.
- `src/lib/platforms/instagram.ts`: Instagram approval-pending adapter.
- `src/lib/publishing/scheduler.ts`: queue scheduling.
- `src/lib/publishing/publish-post.ts`: worker entrypoint.
- `src/lib/validation/video.ts`: video metadata validation rules.
- `src/jobs/publish-due-posts.ts`: scheduled job.
- `tests/unit/video-validation.test.ts`: video validation tests.
- `tests/unit/platform-adapters.test.ts`: adapter tests.
- `tests/unit/scheduled-posts.test.ts`: post creation rules.
- `tests/e2e/composer.spec.ts`: composer happy path.

## Task 1: Scaffold the App

**Files:**
- Create: `package.json`
- Create: `.env.example`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/app-shell.tsx`

- [ ] **Step 1: Create the Next.js project**

Run:

```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Expected: a Next.js app is created in the workspace root.

- [ ] **Step 2: Install core dependencies**

Run:

```powershell
npm install @prisma/client prisma next-auth @next-auth/prisma-adapter stripe zod lucide-react date-fns @aws-sdk/client-s3 @aws-sdk/s3-request-presigner googleapis inngest
npm install -D vitest @testing-library/react @testing-library/jest-dom playwright @playwright/test
```

Expected: dependencies are added to `package.json`.

- [ ] **Step 3: Add environment template**

Create `.env.example`:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/video_scheduler"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-random-secret"
STRIPE_SECRET_KEY="sk_test_replace"
STRIPE_WEBHOOK_SECRET="whsec_replace"
STRIPE_PRICE_ID_PRO="price_replace"
S3_ENDPOINT="https://replace.example.com"
S3_REGION="auto"
S3_BUCKET="video-scheduler-uploads"
S3_ACCESS_KEY_ID="replace"
S3_SECRET_ACCESS_KEY="replace"
GOOGLE_CLIENT_ID="replace.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="replace"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/oauth/youtube/callback"
INNGEST_EVENT_KEY="replace"
```

- [ ] **Step 4: Add a minimal app shell**

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 5: Add a minimal app shell**

Create `src/components/app-shell.tsx`:

```tsx
import Link from "next/link";

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Composer", "/composer"],
  ["Calendar", "/calendar"],
  ["Connections", "/connections"],
  ["Billing", "/billing"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white px-4 py-6 md:block">
        <Link href="/dashboard" className="text-lg font-semibold">
          Video Scheduler
        </Link>
        <nav className="mt-8 grid gap-1">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm hover:bg-zinc-100">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-h-screen md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Wire layout and home redirect**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Scheduler",
  description: "Schedule one short-form video across multiple platforms.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Update `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
```

- [ ] **Step 7: Verify**

Run:

```powershell
npm run lint
npm run dev
```

Expected: lint passes and the app runs at `http://localhost:3000`.

- [ ] **Step 8: Commit**

```powershell
git add .
git commit -m "chore: scaffold video scheduler app"
```

## Task 2: Define the Database Model

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `src/lib/env.ts`
- Create: `tests/unit/scheduled-posts.test.ts`

- [ ] **Step 1: Initialize Prisma**

Run:

```powershell
npx prisma init
```

Expected: Prisma files are created.

- [ ] **Step 2: Define schema**

Replace `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Platform {
  YOUTUBE
  TIKTOK
  INSTAGRAM
}

enum PublishStatus {
  DRAFT
  SCHEDULED
  PROCESSING
  PUBLISHED
  FAILED
  RETRYING
  BLOCKED
  APPROVAL_PENDING
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String?
  image           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  workspaces      WorkspaceMember[]
  accounts        Account[]
  sessions        Session[]
}

model Workspace {
  id                String   @id @default(cuid())
  name              String
  stripeCustomerId  String?
  stripeSubscriptionId String?
  plan              String   @default("beta")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  members           WorkspaceMember[]
  connectedAccounts ConnectedAccount[]
  videos            UploadedVideo[]
  posts             ScheduledPost[]
}

model WorkspaceMember {
  id          String    @id @default(cuid())
  userId      String
  workspaceId String
  role        String    @default("owner")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([userId, workspaceId])
}

model UploadedVideo {
  id          String    @id @default(cuid())
  workspaceId String
  storageKey  String
  fileName    String
  mimeType    String
  sizeBytes   Int
  width       Int?
  height      Int?
  durationSec Int?
  createdAt   DateTime  @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  posts       ScheduledPost[]
}

model ScheduledPost {
  id          String    @id @default(cuid())
  workspaceId String
  videoId     String
  baseCaption String
  scheduledAt DateTime
  timezone    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  video       UploadedVideo @relation(fields: [videoId], references: [id], onDelete: Restrict)
  platformPosts PlatformPost[]
}

model PlatformPost {
  id              String        @id @default(cuid())
  scheduledPostId String
  platform        Platform
  title           String?
  caption         String
  privacy         String        @default("public")
  status          PublishStatus @default(SCHEDULED)
  platformPostId  String?
  lastError        String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  scheduledPost   ScheduledPost @relation(fields: [scheduledPostId], references: [id], onDelete: Cascade)
  attempts        PublishAttempt[]
  @@unique([scheduledPostId, platform])
}

model ConnectedAccount {
  id           String    @id @default(cuid())
  workspaceId  String
  platform     Platform
  accountName  String
  externalId   String
  accessToken  String
  refreshToken String?
  expiresAt    DateTime?
  scopes       String
  status       PublishStatus @default(APPROVAL_PENDING)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([workspaceId, platform, externalId])
}

model PublishAttempt {
  id             String       @id @default(cuid())
  platformPostId String
  status         PublishStatus
  responseCode   String?
  message        String
  retryAt        DateTime?
  createdAt      DateTime     @default(now())
  platformPost   PlatformPost @relation(fields: [platformPostId], references: [id], onDelete: Cascade)
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

- [ ] **Step 3: Add environment validation**

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(24),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID_PRO: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
});

export const env = envSchema.parse(process.env);
```

- [ ] **Step 4: Add Prisma client**

Create `src/lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] **Step 5: Generate and migrate**

Run:

```powershell
npx prisma generate
npx prisma migrate dev --name init
```

Expected: Prisma client is generated and migration succeeds.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat: define scheduler data model"
```

## Task 3: Add Authentication and Workspace Bootstrap

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/types/next-auth.d.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/sign-in/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Configure Auth.js**

Create `src/lib/auth.ts`:

```ts
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER ?? "smtp://localhost:1025",
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const workspace = await db.workspace.create({
        data: {
          name: user.email ? `${user.email}'s Workspace` : "My Workspace",
          members: { create: { userId: user.id, role: "owner" } },
        },
      });
      await db.workspaceMember.upsert({
        where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
        update: {},
        create: { userId: user.id, workspaceId: workspace.id, role: "owner" },
      });
    },
  },
  pages: {
    signIn: "/sign-in",
  },
};
```

- [ ] **Step 2: Add Auth route**

Create `src/types/next-auth.d.ts`:

```ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}
```

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 3: Add sign-in page**

Create `src/app/(auth)/sign-in/page.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-4">
      <form
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          void signIn("email", { email, callbackUrl: "/dashboard" });
        }}
      >
        <h1 className="text-xl font-semibold">Sign in</h1>
        <input
          className="mt-6 w-full rounded-md border border-zinc-300 px-3 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-label="Email address"
          required
        />
        <button className="mt-4 w-full rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white" type="submit">
          Email me a sign-in link
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat: add auth and workspace bootstrap"
```

## Task 4: Add Billing

**Files:**
- Create: `src/lib/billing/stripe.ts`
- Create: `src/app/api/stripe/checkout/route.ts`
- Create: `src/app/api/stripe/portal/route.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/app/(app)/billing/page.tsx`

- [ ] **Step 1: Add Stripe helper**

Create `src/lib/billing/stripe.ts`:

```ts
import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
});
```

- [ ] **Step 2: Create checkout route**

Create `src/app/api/stripe/checkout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { stripe } from "@/lib/billing/stripe";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await db.workspaceMember.findFirst({
    where: { user: { email: session.user.email } },
    include: { workspace: true, user: true },
  });
  if (!member) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: session.user.email,
    line_items: [{ price: env.STRIPE_PRICE_ID_PRO, quantity: 1 }],
    success_url: `${env.NEXTAUTH_URL}/billing?checkout=success`,
    cancel_url: `${env.NEXTAUTH_URL}/billing?checkout=cancelled`,
    metadata: { workspaceId: member.workspaceId },
  });

  return NextResponse.json({ url: checkout.url });
}
```

- [ ] **Step 3: Create billing page**

Create `src/app/(app)/billing/page.tsx`:

```tsx
import { AppShell } from "@/components/app-shell";

export default function BillingPage() {
  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-zinc-600">Manage your subscription and launch plan.</p>
        <form action="/api/stripe/checkout" method="post" className="mt-6">
          <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white" type="submit">
            Start Pro plan
          </button>
        </form>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Add webhook route**

Create `src/app/api/webhooks/stripe/route.ts`:

```ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object;
    const workspaceId = checkout.metadata?.workspaceId;
    if (workspaceId && checkout.customer && checkout.subscription) {
      await db.workspace.update({
        where: { id: workspaceId },
        data: {
          stripeCustomerId: String(checkout.customer),
          stripeSubscriptionId: String(checkout.subscription),
          plan: "pro",
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat: add subscription billing"
```

## Task 5: Add Uploads and Video Validation

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/validation/video.ts`
- Create: `src/app/api/uploads/presign/route.ts`
- Create: `src/components/video-upload.tsx`
- Create: `tests/unit/video-validation.test.ts`

- [ ] **Step 1: Write validation test**

Create `tests/unit/video-validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateShortFormVideo } from "@/lib/validation/video";

describe("validateShortFormVideo", () => {
  it("accepts vertical mp4 videos under the beta limits", () => {
    expect(validateShortFormVideo({ mimeType: "video/mp4", sizeBytes: 50_000_000, width: 1080, height: 1920, durationSec: 45 })).toEqual({ ok: true });
  });

  it("rejects horizontal video", () => {
    expect(validateShortFormVideo({ mimeType: "video/mp4", sizeBytes: 50_000_000, width: 1920, height: 1080, durationSec: 45 })).toEqual({
      ok: false,
      reason: "Upload a vertical video with height greater than width.",
    });
  });
});
```

- [ ] **Step 2: Implement validation**

Create `src/lib/validation/video.ts`:

```ts
type VideoInput = {
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
};

export function validateShortFormVideo(input: VideoInput): { ok: true } | { ok: false; reason: string } {
  if (!["video/mp4", "video/quicktime"].includes(input.mimeType)) {
    return { ok: false, reason: "Upload an MP4 or MOV video." };
  }
  if (input.sizeBytes > 500_000_000) {
    return { ok: false, reason: "Upload a video smaller than 500 MB." };
  }
  if (input.width && input.height && input.height <= input.width) {
    return { ok: false, reason: "Upload a vertical video with height greater than width." };
  }
  if (input.durationSec && input.durationSec > 180) {
    return { ok: false, reason: "Upload a video that is 3 minutes or shorter for the beta." };
  }
  return { ok: true };
}
```

- [ ] **Step 3: Add storage signing**

Create `src/lib/storage.ts`:

```ts
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { env } from "@/lib/env";

const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export async function createUploadUrl(key: string, contentType: string) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 5 },
  );
}

export async function getObjectReadStream(key: string) {
  const response = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
  if (!response.Body) throw new Error("Uploaded video was not found in storage.");
  return response.Body as Readable;
}
```

- [ ] **Step 4: Add presign route**

Create `src/app/api/uploads/presign/route.ts`:

```ts
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createUploadUrl } from "@/lib/storage";

const schema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum(["video/mp4", "video/quicktime"]),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = schema.parse(await request.json());
  const key = `uploads/${randomUUID()}-${input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const url = await createUploadUrl(key, input.contentType);

  return NextResponse.json({ key, url });
}
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm test -- tests/unit/video-validation.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat: add video upload validation"
```

## Task 6: Build Composer and Scheduled Post Creation

**Files:**
- Create: `src/components/platform-selector.tsx`
- Create: `src/app/api/posts/route.ts`
- Create: `src/app/(app)/composer/page.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add post creation route**

Create `src/app/api/posts/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Platform } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const createPostSchema = z.object({
  video: z.object({
    storageKey: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
  }),
  baseCaption: z.string().min(1).max(2200),
  scheduledAt: z.string().datetime(),
  timezone: z.string().min(1),
  platforms: z.array(z.enum(["YOUTUBE", "TIKTOK", "INSTAGRAM"])).min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = createPostSchema.parse(await request.json());
  const member = await db.workspaceMember.findFirst({ where: { user: { email: session.user.email } } });
  if (!member) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const post = await db.scheduledPost.create({
    data: {
      workspaceId: member.workspaceId,
      baseCaption: input.baseCaption,
      scheduledAt: new Date(input.scheduledAt),
      timezone: input.timezone,
      video: {
        create: {
          workspaceId: member.workspaceId,
          storageKey: input.video.storageKey,
          fileName: input.video.fileName,
          mimeType: input.video.mimeType,
          sizeBytes: input.video.sizeBytes,
        },
      },
      platformPosts: {
        create: input.platforms.map((platform) => ({
          platform: platform as Platform,
          caption: input.baseCaption,
          status: platform === "YOUTUBE" ? "SCHEDULED" : "APPROVAL_PENDING",
        })),
      },
    },
    include: { platformPosts: true },
  });

  return NextResponse.json({ post });
}
```

- [ ] **Step 2: Add platform selector**

Create `src/components/platform-selector.tsx`:

```tsx
"use client";

const platforms = [
  { id: "YOUTUBE", label: "YouTube Shorts", note: "Auto-publish beta" },
  { id: "TIKTOK", label: "TikTok", note: "Approval pending" },
  { id: "INSTAGRAM", label: "Instagram Reels", note: "Approval pending" },
];

export function PlatformSelector({ selected, onChange }: { selected: string[]; onChange: (value: string[]) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {platforms.map((platform) => {
        const checked = selected.includes(platform.id);
        return (
          <label key={platform.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onChange(checked ? selected.filter((id) => id !== platform.id) : [...selected, platform.id])}
            />
            <span className="ml-2 font-medium">{platform.label}</span>
            <span className="mt-2 block text-xs text-zinc-500">{platform.note}</span>
          </label>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Add composer page**

Create `src/app/(app)/composer/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PlatformSelector } from "@/components/platform-selector";

export default function ComposerPage() {
  const [platforms, setPlatforms] = useState(["YOUTUBE"]);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">New post</h1>
      <form className="mt-6 grid max-w-3xl gap-5">
        <label className="grid gap-2 text-sm font-medium">
          Video file
          <input className="rounded-md border border-zinc-300 bg-white px-3 py-2" type="file" accept="video/mp4,video/quicktime" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Caption
          <textarea className="min-h-32 rounded-md border border-zinc-300 px-3 py-2" maxLength={2200} />
        </label>
        <PlatformSelector selected={platforms} onChange={setPlatforms} />
        <label className="grid gap-2 text-sm font-medium">
          Schedule time
          <input className="rounded-md border border-zinc-300 bg-white px-3 py-2" type="datetime-local" />
        </label>
        <button className="w-fit rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white" type="submit">
          Schedule post
        </button>
      </form>
    </AppShell>
  );
}
```

- [ ] **Step 4: Add dashboard page**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600">Track scheduled posts and publishing status.</p>
        </div>
        <Link className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white" href="/composer">
          New post
        </Link>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 6: Commit**

```powershell
git add .
git commit -m "feat: add post composer"
```

## Task 7: Add Calendar, Connections, and Post Detail

**Files:**
- Create: `src/components/status-badge.tsx`
- Create: `src/app/(app)/calendar/page.tsx`
- Create: `src/app/(app)/connections/page.tsx`
- Create: `src/app/(app)/posts/[postId]/page.tsx`

- [ ] **Step 1: Add status badge**

Create `src/components/status-badge.tsx`:

```tsx
const labels: Record<string, string> = {
  SCHEDULED: "Scheduled",
  PROCESSING: "Processing",
  PUBLISHED: "Published",
  FAILED: "Failed",
  RETRYING: "Retrying",
  BLOCKED: "Blocked",
  APPROVAL_PENDING: "Approval pending",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700">
      {labels[status] ?? status}
    </span>
  );
}
```

- [ ] **Step 2: Add connections page**

Create `src/app/(app)/connections/page.tsx`:

```tsx
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";

const connections = [
  { name: "YouTube Shorts", status: "SCHEDULED", action: "Connect YouTube", href: "/api/oauth/youtube/start" },
  { name: "TikTok", status: "APPROVAL_PENDING", action: "Approval in progress", href: "#" },
  { name: "Instagram Reels", status: "APPROVAL_PENDING", action: "Approval in progress", href: "#" },
];

export default function ConnectionsPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Connections</h1>
      <div className="mt-6 grid gap-3">
        {connections.map((connection) => (
          <div key={connection.name} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4">
            <div>
              <h2 className="font-medium">{connection.name}</h2>
              <div className="mt-2"><StatusBadge status={connection.status} /></div>
            </div>
            <a className="rounded-md border border-zinc-300 px-3 py-2 text-sm" href={connection.href}>
              {connection.action}
            </a>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Add calendar page**

Create `src/app/(app)/calendar/page.tsx`:

```tsx
import { AppShell } from "@/components/app-shell";

export default function CalendarPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
        Scheduled posts will appear here after the composer saves them.
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat: add scheduler status screens"
```

## Task 8: Add Platform Adapter Interface and YouTube OAuth

**Files:**
- Create: `src/lib/platforms/types.ts`
- Create: `src/lib/platforms/youtube.ts`
- Create: `src/lib/platforms/tiktok.ts`
- Create: `src/lib/platforms/instagram.ts`
- Create: `src/app/api/oauth/youtube/start/route.ts`
- Create: `src/app/api/oauth/youtube/callback/route.ts`
- Create: `tests/unit/platform-adapters.test.ts`

- [ ] **Step 1: Add adapter tests**

Create `tests/unit/platform-adapters.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { tiktokAdapter } from "@/lib/platforms/tiktok";
import { instagramAdapter } from "@/lib/platforms/instagram";

describe("approval pending adapters", () => {
  it("blocks TikTok publishing until approval is enabled", async () => {
    await expect(tiktokAdapter.publish({} as never)).rejects.toThrow("TikTok publishing is pending app approval.");
  });

  it("blocks Instagram publishing until approval is enabled", async () => {
    await expect(instagramAdapter.publish({} as never)).rejects.toThrow("Instagram Reels publishing is pending app approval.");
  });
});
```

- [ ] **Step 2: Add adapter interface**

Create `src/lib/platforms/types.ts`:

```ts
export type PublishInput = {
  accessToken: string;
  videoStorageKey: string;
  title?: string | null;
  caption: string;
  privacy: string;
};

export type PublishResult = {
  platformPostId: string;
  url?: string;
};

export type PlatformAdapter = {
  publish(input: PublishInput): Promise<PublishResult>;
};
```

- [ ] **Step 3: Add pending adapters**

Create `src/lib/platforms/tiktok.ts`:

```ts
import type { PlatformAdapter } from "@/lib/platforms/types";

export const tiktokAdapter: PlatformAdapter = {
  async publish() {
    throw new Error("TikTok publishing is pending app approval.");
  },
};
```

Create `src/lib/platforms/instagram.ts`:

```ts
import type { PlatformAdapter } from "@/lib/platforms/types";

export const instagramAdapter: PlatformAdapter = {
  async publish() {
    throw new Error("Instagram Reels publishing is pending app approval.");
  },
};
```

- [ ] **Step 4: Add YouTube adapter shell**

Create `src/lib/platforms/youtube.ts`:

```ts
import { google } from "googleapis";
import type { PlatformAdapter } from "@/lib/platforms/types";
import { getObjectReadStream } from "@/lib/storage";

export const youtubeAdapter: PlatformAdapter = {
  async publish(input) {
    const videoStream = await getObjectReadStream(input.videoStorageKey);
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: input.accessToken });
    const youtube = google.youtube({ version: "v3", auth });

    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: input.title ?? input.caption.slice(0, 90),
          description: input.caption,
        },
        status: {
          privacyStatus: input.privacy === "private" ? "private" : "public",
        },
      },
      media: {
        body: videoStream,
      },
    });

    if (!response.data.id) throw new Error("YouTube did not return a video id.");
    return { platformPostId: response.data.id, url: `https://www.youtube.com/watch?v=${response.data.id}` };
  },
};
```

- [ ] **Step 5: Add YouTube OAuth start**

Create `src/app/api/oauth/youtube/start/route.ts`:

```ts
import { google } from "googleapis";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";

export async function GET() {
  const oauth2 = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube.upload"],
  });
  redirect(url);
}
```

- [ ] **Step 6: Add YouTube OAuth callback**

Create `src/app/api/oauth/youtube/callback/route.ts`:

```ts
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Platform, PublishStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/sign-in");

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) redirect("/connections?youtube=missing-code");

  const member = await db.workspaceMember.findFirst({ where: { user: { email: session.user.email } } });
  if (!member) redirect("/connections?youtube=no-workspace");

  const oauth2 = new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  const youtube = google.youtube({ version: "v3", auth: oauth2 });
  const channels = await youtube.channels.list({ part: ["snippet"], mine: true });
  const channel = channels.data.items?.[0];
  if (!channel?.id) redirect("/connections?youtube=no-channel");

  await db.connectedAccount.upsert({
    where: {
      workspaceId_platform_externalId: {
        workspaceId: member.workspaceId,
        platform: Platform.YOUTUBE,
        externalId: channel.id,
      },
    },
    update: {
      accountName: channel.snippet?.title ?? "YouTube channel",
      accessToken: tokens.access_token ?? "",
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scopes: "https://www.googleapis.com/auth/youtube.upload",
      status: PublishStatus.SCHEDULED,
    },
    create: {
      workspaceId: member.workspaceId,
      platform: Platform.YOUTUBE,
      externalId: channel.id,
      accountName: channel.snippet?.title ?? "YouTube channel",
      accessToken: tokens.access_token ?? "",
      refreshToken: tokens.refresh_token ?? undefined,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      scopes: "https://www.googleapis.com/auth/youtube.upload",
      status: PublishStatus.SCHEDULED,
    },
  });

  redirect("/connections?youtube=connected");
}
```

- [ ] **Step 7: Verify**

Run:

```powershell
npm test -- tests/unit/platform-adapters.test.ts
npm run lint
```

Expected: tests and lint pass.

- [ ] **Step 8: Commit**

```powershell
git add .
git commit -m "feat: add platform adapter scaffolding"
```

## Task 9: Add Publishing Worker and Retry Flow

**Files:**
- Create: `src/lib/publishing/publish-post.ts`
- Create: `src/lib/publishing/scheduler.ts`
- Create: `src/jobs/publish-due-posts.ts`
- Create: `src/app/api/posts/[postId]/retry/route.ts`

- [ ] **Step 1: Add publisher**

Create `src/lib/publishing/publish-post.ts`:

```ts
import { Platform, PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { youtubeAdapter } from "@/lib/platforms/youtube";
import { tiktokAdapter } from "@/lib/platforms/tiktok";
import { instagramAdapter } from "@/lib/platforms/instagram";

const adapters = {
  [Platform.YOUTUBE]: youtubeAdapter,
  [Platform.TIKTOK]: tiktokAdapter,
  [Platform.INSTAGRAM]: instagramAdapter,
};

export async function publishPlatformPost(platformPostId: string) {
  const platformPost = await db.platformPost.findUnique({
    where: { id: platformPostId },
    include: { scheduledPost: { include: { video: true, workspace: { include: { connectedAccounts: true } } } } },
  });
  if (!platformPost) throw new Error("Platform post not found.");

  const account = platformPost.scheduledPost.workspace.connectedAccounts.find((item) => item.platform === platformPost.platform);
  if (!account) {
    await markFailure(platformPost.id, "No connected account for this platform.", PublishStatus.BLOCKED);
    return;
  }

  await db.platformPost.update({ where: { id: platformPost.id }, data: { status: PublishStatus.PROCESSING } });

  try {
    const result = await adapters[platformPost.platform].publish({
      accessToken: account.accessToken,
      videoStorageKey: platformPost.scheduledPost.video.storageKey,
      title: platformPost.title,
      caption: platformPost.caption,
      privacy: platformPost.privacy,
    });

    await db.platformPost.update({
      where: { id: platformPost.id },
      data: { status: PublishStatus.PUBLISHED, platformPostId: result.platformPostId, lastError: null },
    });
    await db.publishAttempt.create({
      data: { platformPostId: platformPost.id, status: PublishStatus.PUBLISHED, message: "Published successfully." },
    });
  } catch (error) {
    await markFailure(platformPost.id, error instanceof Error ? error.message : "Unknown publishing error.", PublishStatus.FAILED);
  }
}

async function markFailure(platformPostId: string, message: string, status: PublishStatus) {
  await db.platformPost.update({ where: { id: platformPostId }, data: { status, lastError: message } });
  await db.publishAttempt.create({ data: { platformPostId, status, message } });
}
```

- [ ] **Step 2: Add due-post job**

Create `src/jobs/publish-due-posts.ts`:

```ts
import { PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { publishPlatformPost } from "@/lib/publishing/publish-post";

export async function publishDuePosts(now = new Date()) {
  const due = await db.platformPost.findMany({
    where: {
      status: PublishStatus.SCHEDULED,
      scheduledPost: { scheduledAt: { lte: now } },
    },
    select: { id: true },
    take: 25,
  });

  for (const item of due) {
    await publishPlatformPost(item.id);
  }

  return { processed: due.length };
}
```

- [ ] **Step 3: Add retry route**

Create `src/app/api/posts/[postId]/retry/route.ts`:

```ts
import { NextResponse } from "next/server";
import { PublishStatus } from "@prisma/client";
import { db } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: { postId: string } }) {
  await db.platformPost.updateMany({
    where: { scheduledPostId: params.postId, status: { in: [PublishStatus.FAILED, PublishStatus.BLOCKED] } },
    data: { status: PublishStatus.SCHEDULED, lastError: null },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 5: Commit**

```powershell
git add .
git commit -m "feat: add publishing worker flow"
```

## Task 10: Reviewer and Launch Readiness Pages

**Files:**
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Create: `src/app/support/page.tsx`
- Create: `src/app/reviewer-demo/page.tsx`

- [ ] **Step 1: Add legal/support shells**

Create `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, and `src/app/support/page.tsx` with clear draft content marked for legal review:

```tsx
export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-zinc-600">
        Draft for legal review: this service stores account, billing, uploaded video, captions, and connected-platform authorization data to provide scheduled publishing.
      </p>
    </main>
  );
}
```

Use matching page titles for Terms and Support.

- [ ] **Step 2: Add reviewer demo page**

Create `src/app/reviewer-demo/page.tsx`:

```tsx
export default function ReviewerDemoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Reviewer Demo</h1>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm text-zinc-700">
        <li>Sign in with the provided reviewer account.</li>
        <li>Open Connections and connect the requested platform account.</li>
        <li>Open Composer and upload a short vertical video.</li>
        <li>Select the platform under review and schedule the post.</li>
        <li>Open Post Detail to confirm status, errors, and retry behavior.</li>
      </ol>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Run:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] **Step 4: Commit**

```powershell
git add .
git commit -m "chore: add reviewer and policy pages"
```

## Final Verification

- [ ] Run unit tests:

```powershell
npm test
```

Expected: all unit tests pass.

- [ ] Run lint:

```powershell
npm run lint
```

Expected: lint passes.

- [ ] Run database migration:

```powershell
npx prisma migrate dev
```

Expected: database is current.

- [ ] Start dev server:

```powershell
npm run dev
```

Expected: app loads at `http://localhost:3000`.

- [ ] Manual browser check:

Open `http://localhost:3000` and verify Dashboard, Composer, Calendar, Connections, Billing, Privacy, Terms, Support, and Reviewer Demo pages load without console errors.
