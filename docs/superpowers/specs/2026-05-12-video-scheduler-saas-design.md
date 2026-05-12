# Video Scheduler SaaS Design

## Goal

Build a paid SaaS that lets customers create one vertical video post, customize it for TikTok, YouTube Shorts, and Instagram Reels, and schedule publishing across selected platforms.

The first product promise is: create once, schedule everywhere. The first technical milestone is YouTube Shorts auto-publishing, with TikTok and Instagram Reels prepared for approval and added progressively.

## Launch Strategy

Use a paid beta launch with approval-ready publishing.

The app will include the real SaaS foundation: accounts, billing, upload, calendar, connected social accounts, post composer, publishing queue, and platform-specific publishing architecture. YouTube Shorts is the first fully automated integration because its API path is the most direct. TikTok and Instagram Reels will be built behind platform adapter boundaries and moved to live auto-publishing after the relevant developer reviews and audits are approved.

## Users

Primary users are creators, small businesses, agencies, and social media operators who publish short-form vertical video to multiple platforms and want one scheduling workflow.

## Core Workflow

1. User signs up and subscribes.
2. User connects one or more social accounts.
3. User uploads a vertical video.
4. User enters a base caption and hashtags.
5. User selects TikTok, YouTube Shorts, Instagram Reels, or any combination.
6. User customizes platform-specific title, caption, privacy, and settings.
7. User chooses a scheduled publish time.
8. The app stores the scheduled post and creates platform publish jobs.
9. When due, the background worker publishes to platforms that are enabled and approved.
10. The app records status for each platform: scheduled, processing, published, failed, retrying, blocked, or approval pending.

## MVP Scope

Included:

- User authentication.
- Customer workspace.
- Stripe subscription checkout and billing portal.
- Video upload and storage.
- Basic vertical video validation.
- Base caption and per-platform overrides.
- Platform selection for TikTok, YouTube Shorts, and Instagram Reels.
- Scheduling calendar.
- YouTube Shorts auto-publishing.
- TikTok and Instagram integration scaffolds and approval-ready connection screens.
- Publish status tracking.
- Retry and failure logging.
- Admin view for failed publishes, queue health, and platform readiness.
- Privacy policy, terms, support, and reviewer demo flows.

Excluded from the first version:

- AI content generation.
- Advanced analytics.
- Team collaboration.
- Bulk CSV scheduling.
- Comment or inbox management.
- Native editing tools.
- Cross-platform trend research.

## Architecture

Use a dependable web SaaS stack:

- Next.js app for the user interface and API routes.
- Postgres database for users, workspaces, subscriptions, connected accounts, posts, scheduled jobs, and publish attempts.
- Object storage for uploaded videos and platform/transcode variants.
- Background worker for scheduled publishing, retries, and platform status polling.
- Stripe for subscriptions and billing.
- Platform adapter modules for YouTube, TikTok, and Instagram so each API is isolated.

## Main Screens

Dashboard:
Shows upcoming scheduled posts, recent publish results, failed items, and a new post action.

Composer:
Lets the user upload a video, enter a base caption, select platforms, customize per-platform settings, and schedule the post.

Calendar:
Shows scheduled posts by day or week with platform status indicators.

Connections:
Lets users connect YouTube, TikTok, and Instagram accounts. Each connection shows whether publishing is live, approval pending, or blocked by account requirements.

Post Detail:
Shows video preview, captions, selected platforms, publish attempts, errors, and retry actions.

Billing:
Shows current plan, usage, invoices, and subscription management.

Admin/Ops:
Internal view for failed publishes, API errors, queued jobs, account connection failures, and platform review readiness.

## Platform Requirements

YouTube:

- Google Cloud project.
- YouTube Data API v3 enabled.
- OAuth consent screen.
- OAuth upload scope.
- `videos.insert` upload flow.
- API audit before public uploads can reliably be made from customer accounts.

TikTok:

- TikTok Developer app.
- Login/OAuth flow.
- Content Posting API product.
- Direct Post enabled.
- `video.publish` scope approval.
- TikTok audit before public direct posting.
- UX must show creator info, privacy selection, comments/duet/stitch settings, commercial content disclosure, and required consent language.

Instagram:

- Meta Developer app.
- Instagram professional/business account support.
- Meta/Instagram OAuth.
- Content publishing permissions, expected to include `instagram_business_basic` and `instagram_business_content_publish` for the newer Instagram business API path.
- App Review approval.
- Review demo must show the app actively using the requested publishing permission.

## Data Model

Core entities:

- User
- Workspace
- Subscription
- ConnectedAccount
- UploadedVideo
- ScheduledPost
- PlatformPost
- PublishAttempt
- PlatformCredential
- WebhookEvent
- AuditLog

Each ScheduledPost owns one uploaded video and base metadata. Each PlatformPost stores platform-specific metadata and status. PublishAttempt records every publish or retry attempt so failures can be diagnosed without losing history.

## Error Handling

The app should assume publishing can fail because of expired tokens, account permission changes, API quota limits, video format problems, platform processing delays, or app approval restrictions.

Every platform publish job must record:

- Current state.
- Platform response code.
- Human-readable failure message.
- Retry eligibility.
- Next retry time if applicable.
- Whether user action is required.

## Testing

Initial testing should cover:

- Account signup and billing flow.
- Video upload and validation.
- Scheduled post creation.
- Calendar display.
- YouTube OAuth connection.
- YouTube upload to a test channel.
- Publish status updates.
- Retry behavior after simulated API failures.
- Connection screens for TikTok and Instagram approval-pending states.

## Open Decisions

- Product name and brand.
- Pricing tiers and launch offer.
- Exact video limits by plan.
- Whether TikTok and Instagram start as approval-pending only or include manual assisted publishing fallback.
- Hosting provider and storage provider.
