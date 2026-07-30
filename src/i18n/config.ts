/**
 * English is the default and the reference for the key structure; German is
 * fully supported and switchable in the UI.
 *
 * Adding another language means adding one JSON file under `dictionaries/`
 * and one entry here — routing needs no changes.
 */
export const locales = ["en", "de"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Names as written in their own language, for the language switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Cookie that remembers a deliberate choice from the switcher. */
export const LOCALE_COOKIE = "locale";

/**
 * Picks the best language from the Accept-Language header.
 * Deliberately without a dependency: a handful of locales doesn't justify a
 * full BCP-47 matcher.
 */
export function matchLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { tag: tag.toLowerCase(), quality: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag.length > 0 && !Number.isNaN(entry.quality))
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }

  return defaultLocale;
}

/** Swaps the locale prefix of a path: `/de/review` → `/en/review`. */
export function withLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  // segments[0] is empty (leading slash), segments[1] is the current locale.
  if (isLocale(segments[1] ?? "")) {
    segments[1] = locale;
    return segments.join("/");
  }
  return `/${locale}${pathname}`;
}
