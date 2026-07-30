import { NextResponse, type NextRequest } from "next/server";

import { locales, matchLocale } from "@/i18n/config";

const LOCALE_COOKIE = "locale";

/**
 * Locale prefixes the app used to serve. A path still carrying one is
 * rewritten to the equivalent current path instead of getting the default
 * prefix bolted on in front of it — otherwise an old `/de/dashboard` link
 * would end up at `/en/de/dashboard`, which is a 404.
 */
const RETIRED_LOCALES = ["de"];

/**
 * Makes sure every page URL carries a locale prefix (`/en/...`).
 * Redirect only, on purpose — the access check happens server-side in the
 * layout under `(app)`, because per the Next docs a proxy is not meant to be
 * a full authorization solution.
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

  const retired = RETIRED_LOCALES.find(
    (old) => pathname === `/${old}` || pathname.startsWith(`/${old}/`),
  );
  const rest = retired ? pathname.slice(retired.length + 1) : pathname;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${rest === "/" ? "" : rest}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals, API routes and files with an extension.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
