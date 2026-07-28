"use server";

import type { Locale } from "@/i18n/config";
import { signOut } from "@/lib/auth";

export async function logout(locale: Locale) {
  await signOut({ redirectTo: `/${locale}` });
}
