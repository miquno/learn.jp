import "server-only";

import type { SrsItemType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

/** Ein Element, wie es in Lern- und Wiederholungssitzungen gezeigt wird. */
export type ReviewItem = {
  cardId: string;
  itemType: SrsItemType;
  /** Was gefragt wird — das Zeichen, das Wort. */
  prompt: string;
  /** Erwartete Antwort in Romaji (Kana) bzw. Lesung (Wort). */
  reading: string;
  /** Bedeutung in der Sprache des Nutzers, wo vorhanden. */
  meaning: string | null;
  isNew: boolean;
};

type Meanings = { de?: string[]; en?: string[] };

function pickMeaning(meanings: unknown, locale: "de" | "en"): string | null {
  const value = meanings as Meanings | null;
  if (!value) return null;
  // Fällt auf Englisch zurück: bei Kanji fehlt Deutsch komplett, bei Wörtern
  // in 3,6 % der Fälle. Ein leeres Feld wäre schlechter als die andere Sprache.
  const list = value[locale]?.length ? value[locale] : value.en;
  return list?.[0] ?? null;
}

/**
 * Fällige Karten, älteste zuerst. Es gibt bewusst kein Tageslimit für
 * Wiederholungen — wer eine Karte fällig hat, hat sie fällig; ein Deckel
 * würde den Rückstand nur in die Zukunft verschieben und dort vergrößern.
 */
export async function getDueCards(
  userId: string,
  locale: "de" | "en",
  limit = 100,
): Promise<ReviewItem[]> {
  const cards = await db.srsCard.findMany({
    where: { userId, due: { lte: new Date() } },
    orderBy: { due: "asc" },
    take: limit,
    include: { kana: true, word: true, kanji: true },
  });

  return cards.flatMap((card) => {
    if (card.kana) {
      return [{
        cardId: card.id,
        itemType: card.itemType,
        prompt: card.kana.character,
        reading: card.kana.romaji,
        meaning: null,
        isNew: card.state === "new",
      }];
    }
    if (card.word) {
      return [{
        cardId: card.id,
        itemType: card.itemType,
        prompt: card.word.written ?? card.word.reading,
        reading: card.word.reading,
        meaning: pickMeaning(card.word.meanings, locale),
        isNew: card.state === "new",
      }];
    }
    if (card.kanji) {
      return [{
        cardId: card.id,
        itemType: card.itemType,
        prompt: card.kanji.character,
        reading: card.kanji.kunyomi[0] ?? card.kanji.onyomi[0] ?? "",
        meaning: pickMeaning(card.kanji.meanings, locale),
        isNew: card.state === "new",
      }];
    }
    // Verwaiste Karte — kann nur auftreten, wenn Inhalte gelöscht wurden,
    // bevor der Fremdschlüssel-Cascade griff.
    return [];
  });
}

export async function countDue(userId: string) {
  return db.srsCard.count({
    where: { userId, due: { lte: new Date() } },
  });
}

/**
 * Die nächsten noch nicht begonnenen Kana in Lernreihenfolge.
 *
 * Erst die vollständige Hiragana-Tafel, dann Katakana — gemischt zu lernen
 * ist der häufigste Grund, warum Anfänger beide Schriften verwechseln.
 */
export async function getNextKana(userId: string, limit: number) {
  const started = await db.srsCard.findMany({
    where: { userId, kanaId: { not: null } },
    select: { kanaId: true },
  });
  const startedIds = started
    .map((card) => card.kanaId)
    .filter((id): id is string => id !== null);

  return db.kana.findMany({
    where: { id: { notIn: startedIds } },
    orderBy: [{ script: "asc" }, { order: "asc" }],
    take: limit,
  });
}

/** Wie weit die beiden Silbenschriften jeweils gelernt sind. */
export async function getKanaProgress(userId: string) {
  const [totals, learned] = await Promise.all([
    db.kana.groupBy({ by: ["script"], _count: true }),
    db.srsCard.groupBy({
      by: ["state"],
      where: { userId, kanaId: { not: null } },
      _count: true,
    }),
  ]);

  const total = totals.reduce((sum, row) => sum + row._count, 0);
  const started = learned.reduce((sum, row) => sum + row._count, 0);
  // "Gelernt" heißt: die Karte hat die Lernphase verlassen.
  const known = learned
    .filter((row) => row.state === "review")
    .reduce((sum, row) => sum + row._count, 0);

  return { total, started, known };
}
