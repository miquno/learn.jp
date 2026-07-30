"use server";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Remembers a deliberate language choice.
 *
 * The cookie is what the proxy reads, so it has to be set for everyone —
 * signed in or not. For signed-in accounts the choice is also written to the
 * user record, so it survives a new device where no cookie exists yet.
 */
export async function setLocale(value: string) {
  if (!isLocale(value)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    await db.user.update({
      where: { id: session.user.id },
      data: { locale: value },
    });
  }
}
