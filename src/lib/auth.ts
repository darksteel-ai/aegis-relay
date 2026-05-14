import { currentUser } from "@clerk/nextjs/server";

import { convexApi } from "@/lib/convex-api";
import { getConvexClient } from "@/lib/convex-server";

type UserForWorkspace = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

export type AppAuthSession = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
};

export async function ensureWorkspaceForUser(user: UserForWorkspace) {
  await getConvexClient().mutation(convexApi.workspaces.ensureForUser, {
    userId: user.id,
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    image: user.image ?? undefined,
  });
}

export async function getAuthSession(): Promise<AppAuthSession | null> {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  const name = user.fullName ?? user.username ?? email?.split("@")[0] ?? null;
  const session = {
    user: {
      id: user.id,
      email,
      name,
      image: user.imageUrl,
    },
  };

  await ensureWorkspaceForUser(session.user);

  return session;
}
