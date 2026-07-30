"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import * as z from "zod";

import { defaultLocale, isLocale } from "@/i18n/config";
import { signIn } from "@/lib/auth";
import { db } from "@/lib/db";

export type AuthFormState = { error?: "invalid" | "taken" | "generic" };

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(200),
});

function localeFrom(formData: FormData) {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeFrom(formData);
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid" };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: `/${locale}/dashboard`,
    });
  } catch (error) {
    // signIn signals success by throwing a redirect — that has to propagate,
    // or nobody ever lands on the dashboard.
    if (error instanceof AuthError) return { error: "invalid" };
    throw error;
  }

  return {};
}

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const locale = localeFrom(formData);
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "invalid" };

  const { email, username, password } = parsed.data;

  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { id: true },
  });
  if (existing) return { error: "taken" };

  try {
    await db.user.create({
      data: {
        email,
        username,
        passwordHash: await bcrypt.hash(password, 12),
        locale,
        // Email verification comes later; until then the account works right
        // away, so the first run doesn't hinge on an inbox.
        status: "active",
      },
    });
  } catch {
    return { error: "generic" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: `/${locale}/dashboard`,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "generic" };
    throw error;
  }

  return {};
}
