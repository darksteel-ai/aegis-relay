import { createHash } from "crypto";

import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";
import { getAuthEnv } from "@/lib/env";

type UserForWorkspace = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export function authUserIdForEmail(email: string) {
  return `email-${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32)}`;
}

export async function ensureWorkspaceForUser(user: UserForWorkspace) {
  await getConvexClient().mutation(convexApi.workspaces.ensureForUser, {
    userId: user.id,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    image: user.image ?? undefined,
  });
}

export function createAuthOptions(
  source: Record<string, string | undefined> = process.env,
): NextAuthOptions {
  const authEnv = getAuthEnv(source);

  return {
    providers: [
      CredentialsProvider({
        id: "email",
        name: "Email",
        credentials: {
          email: { label: "Email", type: "email" },
        },
        async authorize(credentials) {
          const email = credentials?.email?.trim().toLowerCase();
          if (!email || !email.includes("@")) {
            return null;
          }
          const user = {
            id: authUserIdForEmail(email),
            email,
            name: email.split("@")[0],
          };
          await ensureWorkspaceForUser(user);
          return user;
        },
      }),
    ],
    pages: {
      signIn: "/sign-in",
    },
    secret: authEnv.NEXTAUTH_SECRET,
    session: {
      strategy: "jwt",
    },
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.sub = user.id;
          token.email = user.email;
          token.name = user.name;
        }
        return token;
      },
      session({ session, token }) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
        }
        return session;
      },
    },
  };
}

export function getAuthSession() {
  return getServerSession(createAuthOptions());
}
