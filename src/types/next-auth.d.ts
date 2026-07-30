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

// `next-auth/jwt` only re-exports (`export * from "@auth/core/jwt"`) — an
// augmentation there has no effect and `token.role` would stay `unknown`.
declare module "@auth/core/jwt" {
  interface JWT {
    role?: UserRole;
    tier?: UserTier;
    username?: string;
  }
}

export {};
