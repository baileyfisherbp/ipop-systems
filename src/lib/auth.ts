import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Hard-coded owner emails — these are always promoted to OWNER on sign-in
const OWNER_EMAILS = ["hello@baileyfisher.me"];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,

  session: {
    strategy: "database",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.compose",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/drive.readonly",
          ].join(" "),
        },
      },
    }),

  ],

  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      // --- Email Whitelist Check ---
      const envEmails = (process.env.AUTH_ALLOWED_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      const dbAllowed = await prisma.allowedEmail.findUnique({
        where: { email },
      });

      if (!envEmails.includes(email) && !dbAllowed) {
        return false; // Reject non-whitelisted emails
      }

      // --- Role Promotion ---
      const isOwnerEmail = OWNER_EMAILS.includes(email);
      const newRole = isOwnerEmail ? "OWNER" : "ADMIN";

      await prisma.user.updateMany({
        where: { email },
        data: {
          role: newRole,
          lastSeenAt: new Date(),
          ...(user.image ? { image: user.image } : {}),
        },
      });

      // --- Persist OAuth Tokens ---
      if (account && account.provider !== "credentials") {
        const existingAccount = await prisma.account.findFirst({
          where: { userId: user.id!, provider: account.provider },
        });

        if (existingAccount) {
          await prisma.account.update({
            where: { id: existingAccount.id },
            data: {
              access_token: account.access_token,
              refresh_token:
                account.refresh_token ?? existingAccount.refresh_token,
              expires_at: account.expires_at,
              scope: account.scope,
              id_token: account.id_token,
            },
          });
        }
      }

      return true;
    },

    async session({ session, user, token }) {
      if (session.user) {
        // Database sessions (production)
        if (user) {
          session.user.id = user.id;
          session.user.role = (user as any).role;
        }
        // JWT sessions (development)
        if (token?.sub) {
          session.user.id = token.sub;
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true },
          });
          session.user.role = dbUser?.role ?? "USER";
        }
      }
      return session;
    },
  },
});

// Helper functions for role-based authorization
export function isAdminOrOwner(role?: string) {
  return role === "ADMIN" || role === "OWNER";
}

export function isOwner(role?: string) {
  return role === "OWNER";
}
