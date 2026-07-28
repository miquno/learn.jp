import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import * as z from "zod";

import { db } from "@/lib/db";

import { authConfig } from "./config";

const credentialsSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        // Auch ohne Treffer wird gehasht, damit die Antwortzeit nicht
        // verrät, ob die E-Mail existiert.
        const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
        const valid = await bcrypt.compare(parsed.data.password, hash);

        if (!user || !valid || user.status === "banned") return null;

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          image: user.avatarUrl,
          role: user.role,
          tier: user.tier,
          username: user.username,
        };
      },
    }),
  ],
});
