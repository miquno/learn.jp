import "server-only";

import type en from "./dictionaries/en.json";
import type { Locale } from "./config";

/**
 * English defines the key structure. Every other language must cover it fully
 * — a missing key fails the type check instead of rendering an empty label at
 * runtime.
 */
export type Dictionary = typeof en;

/**
 * Dynamic imports, so each request only pulls the dictionary it needs into
 * the server bundle.
 */
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  de: () => import("./dictionaries/de.json").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
