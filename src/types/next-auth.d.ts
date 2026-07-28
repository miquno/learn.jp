import type { UserRole, UserTier } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    tier?: UserTier;
    username?: string;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: UserRole;
      tier?: UserTier;
      username?: string;
    };
  }
}

// `next-auth/jwt` re-exportiert nur (`export * from "@auth/core/jwt"`) —
// eine Augmentierung dort läuft ins Leere und `token.role` bliebe `unknown`.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
    tier?: UserTier;
    username?: string;
  }
}

export {};
