import { redirect } from "next/navigation";

import type { Locale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * For every page below `(app)`. Returns the full database record rather than
 * the JWT claims — the session intentionally holds display data only and can
 * be stale.
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
