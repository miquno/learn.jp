import "server-only";

import type de from "./dictionaries/de.json";
import type { Locale } from "./config";

/**
 * German is the reference for the key structure — if a key is missing in
 * another language the type check fails, instead of rendering an empty label
 * at runtime.
 */
export type Dictionary = typeof de;

/**
 * Dynamic imports, so each request only pulls the dictionary it needs into
 * the server bundle.
 */
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  de: () => import("./dictionaries/de.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
