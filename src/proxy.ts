import { NextResponse, type NextRequest } from "next/server";

import { locales, matchLocale } from "@/i18n/config";

const LOCALE_COOKIE = "locale";

/**
 * Sorgt dafür, dass jede Seiten-URL ein Sprachpräfix trägt (`/de/...`).
 * Bewusst nur Weiterleitung — die Zugriffsprüfung passiert serverseitig im
 * Layout unter `(app)`, weil Proxy laut Next-Doku keine vollwertige
 * Autorisierungslösung sein soll.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && locales.includes(cookieLocale as (typeof locales)[number])
      ? cookieLocale
      : matchLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Alles außer Next-Interna, API-Routen und Dateien mit Endung.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
