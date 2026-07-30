import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE, isLocale, locales, matchLocale } from "@/i18n/config";

/**
 * Makes sure every page URL carries a locale prefix (`/en/...`, `/de/...`).
 * Redirect only, on purpose — the access check happens server-side in the
 * layout under `(app)`, because per the Next docs a proxy is not meant to be
 * a full authorization solution.
 *
 * Precedence: an explicit choice from the language switcher (cookie) beats
 * the browser's Accept-Language header. Someone who switched deliberately
 * should not be flipped back on the next visit.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale =
    cookieLocale && isLocale(cookieLocale)
      ? cookieLocale
      : matchLocale(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals, API routes and files with an extension.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
