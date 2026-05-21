import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import type { Id } from "../../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";

type DisconnectRouteContext = {
  params: Promise<{
    accountId: string;
  }>;
};

export async function POST(request: Request, { params }: DisconnectRouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = await params;
  await getConvexClient().mutation(convexApi.connections.disconnectForUser, {
    userId: session.user.id,
    accountId: accountId as Id<"connectedAccounts">,
  });

  if (request.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/connections?connection=disconnected", request.url), 303);
  }

  return NextResponse.json({ disconnected: true });
}
