import { z } from "zod";

type EnvSource = Record<string, string | undefined>;

const coreEnvSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(24),
});

const authEnvSchema = coreEnvSchema.pick({
  NEXTAUTH_SECRET: true,
});

const clerkEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().min(1).optional(),
});

const stripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_ID_PRO: z.string().min(1),
});

const storageEnvSchema = z.object({
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
});

const googleEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
});

const tiktokEnvSchema = z.object({
  TIKTOK_REDIRECT_URI: z.string().url().optional(),
});

const instagramEnvSchema = z.object({
  META_APP_ID: z.string().min(1).optional(),
  META_APP_SECRET: z.string().min(1).optional(),
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
});

const platformTokenEnvSchema = z.object({
  PLATFORM_TOKEN_ENCRYPTION_KEY: z.string().min(32),
});

const inngestEnvSchema = z.object({
  INNGEST_EVENT_KEY: z.string().min(1),
});

const convexEnvSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  CONVEX_DEPLOY_KEY: z.string().min(1).optional(),
});

const schedulerEnvSchema = coreEnvSchema
  .extend(clerkEnvSchema.shape)
  .extend(stripeEnvSchema.shape)
  .extend(storageEnvSchema.shape)
  .extend(googleEnvSchema.shape)
  .extend(tiktokEnvSchema.shape)
  .extend(instagramEnvSchema.shape)
  .extend(platformTokenEnvSchema.shape)
  .extend(inngestEnvSchema.shape)
  .extend(convexEnvSchema.shape);

export function parseCoreEnv(source: EnvSource = process.env) {
  return coreEnvSchema.parse(source);
}

export function getAuthEnv(source: EnvSource = process.env) {
  return authEnvSchema.parse(source);
}

export function getClerkEnv(source: EnvSource = process.env) {
  return clerkEnvSchema.parse(source);
}

export function getStripeEnv(source: EnvSource = process.env) {
  return stripeEnvSchema.parse(source);
}

export function getStorageEnv(source: EnvSource = process.env) {
  return storageEnvSchema.parse(source);
}

export function getGoogleEnv(source: EnvSource = process.env) {
  return googleEnvSchema.parse(source);
}

export function getTikTokEnv(source: EnvSource = process.env) {
  return tiktokEnvSchema.parse(source);
}

export function getInstagramEnv(source: EnvSource = process.env) {
  return instagramEnvSchema.parse(source);
}

export function getPlatformTokenEnv(source: EnvSource = process.env) {
  return platformTokenEnvSchema.parse(source);
}

export function getInngestEnv(source: EnvSource = process.env) {
  return inngestEnvSchema.parse(source);
}

export function getConvexEnv(source: EnvSource = process.env) {
  return convexEnvSchema.parse(source);
}

export function parseSchedulerEnv(source: EnvSource = process.env) {
  return schedulerEnvSchema.parse(source);
}

export const env = new Proxy({} as z.infer<typeof coreEnvSchema>, {
  get(_target, property) {
    return parseCoreEnv()[property as keyof z.infer<typeof coreEnvSchema>];
  },
});
