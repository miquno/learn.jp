import "server-only";

import type de from "./dictionaries/de.json";
import type { Locale } from "./config";

/**
 * Deutsch ist die Referenz für die Schlüsselstruktur — fehlt in einer anderen
 * Sprache ein Schlüssel, schlägt der Typecheck fehl statt erst zur Laufzeit
 * ein leeres Label zu rendern.
 */
export type Dictionary = typeof de;

/**
 * Dynamische Importe, damit pro Anfrage nur das benötigte Wörterbuch
 * ins Server-Bundle geladen wird.
 */
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  de: () => import("./dictionaries/de.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
