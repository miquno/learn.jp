import { redirect } from "next/navigation";

import type { Locale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Für alle Seiten unterhalb von `(app)`. Liefert den vollständigen Datensatz
 * aus der Datenbank statt der JWT-Claims — die Session enthält absichtlich nur
 * Anzeigedaten und kann veraltet sein.
 */
export async function requireUser(locale: Locale) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status === "banned") {
    redirect(`/${locale}/login`);
  }

  return user;
}
