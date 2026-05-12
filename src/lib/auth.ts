import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { getServerSession, type NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";

import { db } from "@/lib/db";

type UserForWorkspace = {
  id: string;
  email?: string | null;
  name?: string | null;
};

type WorkspaceBootstrapTx = {
  workspace: {
    create(args: {
      data: { name: string };
      select: { id: true };
    }): Promise<{ id: string }>;
  };
  workspaceMember: {
    upsert(args: {
      where: { userId_workspaceId: { userId: string; workspaceId: string } };
      create: { userId: string; workspaceId: string; role: "owner" };
      update: Record<string, never>;
    }): Promise<unknown>;
  };
};

type WorkspaceBootstrapDb = {
  workspaceMember: {
    findFirst(args: {
      where: { userId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  $transaction<T>(callback: (tx: WorkspaceBootstrapTx) => Promise<T>): Promise<T>;
};

function getDefaultWorkspaceName(user: UserForWorkspace) {
  if (user.name?.trim()) {
    return `${user.name.trim()}'s Workspace`;
  }

  const emailName = user.email?.split("@")[0]?.trim();
  return emailName ? `${emailName}'s Workspace` : "My Workspace";
}

export async function ensureWorkspaceForUser(
  user: UserForWorkspace,
  prisma: WorkspaceBootstrapDb = db as unknown as WorkspaceBootstrapDb,
) {
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existingMembership) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: getDefaultWorkspaceName(user) },
      select: { id: true },
    });

    await tx.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id,
        },
      },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "owner",
      },
      update: {},
    });
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER ?? {
        host: "localhost",
        port: 1025,
        secure: false,
      },
      from: process.env.EMAIL_FROM ?? "Video Scheduler <no-reply@example.com>",
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  secret: process.env.NEXTAUTH_SECRET ?? "development-only-video-scheduler-secret",
  session: {
    strategy: "database",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await ensureWorkspaceForUser(user);
    },
  },
};

export function getAuthSession() {
  return getServerSession(authOptions);
}
