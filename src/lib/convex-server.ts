import { ConvexHttpClient } from "convex/browser";

let client: ConvexHttpClient | null = null;

export function getConvexClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;

  if (!url) {
    throw new Error("Convex is not configured. Set NEXT_PUBLIC_CONVEX_URL.");
  }

  if (!client) {
    client = new ConvexHttpClient(url);
  }

  return client;
}
