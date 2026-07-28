import type { NextAuthConfig } from "next-auth";

/**
 * Provider-freie Basiskonfiguration. Sie enthält bewusst keine Prisma- oder
 * bcrypt-Importe, damit sie auch aus schlanken Laufzeiten importierbar bleibt.
 * Die eigentlichen Provider hängen in `src/lib/auth/index.ts`.
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
        // Nur zur Anzeige (z. B. Badge im Header). Ob jemand wirklich Premium
        // hat, wird bei jeder Freischaltung frisch aus der Datenbank geprüft —
        // dieser Claim kann direkt nach einem Stripe-Vorgang veraltet sein.
        session.user.tier = token.tier;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
