import { z } from "zod";

const coreEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(24),
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

const inngestEnvSchema = z.object({
  INNGEST_EVENT_KEY: z.string().min(1),
});

const schedulerEnvSchema = coreEnvSchema
  .extend(stripeEnvSchema.shape)
  .extend(storageEnvSchema.shape)
  .extend(googleEnvSchema.shape)
  .extend(inngestEnvSchema.shape);

export function parseCoreEnv(source: NodeJS.ProcessEnv = process.env) {
  return coreEnvSchema.parse(source);
}

export function getStripeEnv(source: NodeJS.ProcessEnv = process.env) {
  return stripeEnvSchema.parse(source);
}

export function getStorageEnv(source: NodeJS.ProcessEnv = process.env) {
  return storageEnvSchema.parse(source);
}

export function getGoogleEnv(source: NodeJS.ProcessEnv = process.env) {
  return googleEnvSchema.parse(source);
}

export function getInngestEnv(source: NodeJS.ProcessEnv = process.env) {
  return inngestEnvSchema.parse(source);
}

export function parseSchedulerEnv(source: NodeJS.ProcessEnv = process.env) {
  return schedulerEnvSchema.parse(source);
}

export const env = parseCoreEnv();
