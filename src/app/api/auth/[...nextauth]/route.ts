import NextAuth from "next-auth";
import type { NextRequest } from "next/server";

import { createAuthOptions } from "@/lib/auth";

type AuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

export function GET(request: NextRequest, context: AuthRouteContext) {
  return NextAuth(request, context, createAuthOptions());
}

export function POST(request: NextRequest, context: AuthRouteContext) {
  return NextAuth(request, context, createAuthOptions());
}
