import "server-only";

import type { SrsItemType } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db";

/** One item as shown in a lesson or review session. */
export type ReviewItem = {
  cardId: string;
  itemType: SrsItemType;
  /** What is being asked — the character, the word. */
  prompt: string;
  /** Expected answer in romaji (kana) or reading (word). */
  reading: string;
  /** Meaning in the user's language, where available. */
  meaning: string | null;
  isNew: boolean;
};

type Meanings = { de?: string[]; en?: string[] };

/**
 * The database still holds German glosses from JMdict for most words, but the
 * app ships in English only — so only `en` is read. The German data stays put
 * rather than being thrown away: re-importing it costs a full JMdict pass.
 */
function pickMeaning(meanings: unknown, locale: Locale): string | null {
  const value = meanings as Meanings | null;
  return value?.[locale]?.[0] ?? null;
}

/**
 * Due cards, oldest first. There is deliberately no daily cap on reviews — if
 * a card is due, it is due; a cap would only push the backlog into the future
 * and grow it there.
 */
export async function getDueCards(
  userId: string,
  locale: Locale,
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
    // Orphaned card — only possible if content was deleted before the foreign
    // key cascade took effect.
    return [];
  });
}

export async function countDue(userId: string) {
  return db.srsCard.count({
    where: { userId, due: { lte: new Date() } },
  });
}

/**
 * The next kana not yet started, in learning order.
 *
 * The full hiragana table first, then katakana — learning both mixed is the
 * most common reason beginners keep confusing the two scripts.
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

/** How far each of the two syllabaries has been learned. */
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
  // "Learned" means the card has left the learning phase.
  const known = learned
    .filter((row) => row.state === "review")
    .reduce((sum, row) => sum + row._count, 0);

  return { total, started, known };
}
