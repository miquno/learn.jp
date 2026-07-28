export const locales = ["de", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Wählt anhand des Accept-Language-Headers die passende Sprache.
 * Bewusst ohne Zusatzabhängigkeit: zwei Locales rechtfertigen keinen
 * vollständigen BCP-47-Matcher.
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
