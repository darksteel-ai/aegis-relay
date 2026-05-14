import { ConvexHttpClient } from "convex/browser";

let client: ConvexHttpClient | null = null;

export function getConvexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;

  if (!url || url.startsWith("http://127.0.0.1") || url.startsWith("http://localhost")) {
    return null;
  }

  return url;
}

export function isConvexConfigured() {
  return Boolean(getConvexUrl());
}

export function getConvexClient() {
  const url = getConvexUrl();

  if (!url) {
    throw new Error("Convex is not configured. Set NEXT_PUBLIC_CONVEX_URL.");
  }

  if (!client) {
    client = new ConvexHttpClient(url);
  }

  return client;
}
