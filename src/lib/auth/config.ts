import type { NextAuthConfig } from "next-auth";

/**
 * Provider-free base configuration. It deliberately contains no Prisma or
 * bcrypt imports so it stays importable from lean runtimes. The actual
 * providers live in `src/lib/auth/index.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/de/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tier = user.tier;
        token.username = user.username;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
        session.user.username = token.username;
        // Display only (e.g. the header badge). Whether someone really has
        // premium is re-checked against the database on every gate — this
        // claim can be stale right after a Stripe operation.
        session.user.tier = token.tier;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
