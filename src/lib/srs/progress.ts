import "server-only";

import type { KanaScript, KanaType } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/config";
import { db } from "@/lib/db";

/**
 * Mastery of a single item, as the progress screens show it.
 *
 * `mastery` is the FSRS state expressed as a share, not an accuracy: a card
 * that has left the learning phase counts as known regardless of how many
 * times it was fumbled on the way. Accuracy is reported separately, because
 * the two answer different questions — "do I know this yet" versus "how badly
 * does this one trip me up".
 */
export type ItemProgress = {
  id: string;
  character: string;
  reading: string;
  started: boolean;
  known: boolean;
  reviews: number;
  correct: number;
};

export type KanaRow = {
  row: string;
  type: KanaType;
  items: ItemProgress[];
};

/** Per-card review tallies, keyed by card id. */
async function tallyByCard(userId: string) {
  const rows = await db.reviewLog.groupBy({
    by: ["cardId", "rating"],
    where: { userId },
    _count: true,
  });

  const tally = new Map<string, { reviews: number; correct: number }>();
  for (const row of rows) {
    const entry = tally.get(row.cardId) ?? { reviews: 0, correct: 0 };
    entry.reviews += row._count;
    if (row.rating !== "again") entry.correct += row._count;
    tally.set(row.cardId, entry);
  }
  return tally;
}

/**
 * The full kana table with the learner's state on every character.
 *
 * The whole table is returned, not just what has been started — the point of
 * the screen is to see the shape of what is left, which an "only what you
 * touched" list cannot show.
 */
export async function getKanaTable(
  userId: string,
  script: KanaScript,
): Promise<KanaRow[]> {
  const [kana, cards, tally] = await Promise.all([
    db.kana.findMany({ where: { script }, orderBy: { order: "asc" } }),
    db.srsCard.findMany({
      where: { userId, kana: { script } },
      select: { id: true, kanaId: true, state: true },
    }),
    tallyByCard(userId),
  ]);

  const cardByKana = new Map(
    cards.map((card) => [card.kanaId as string, card]),
  );

  const rows = new Map<string, KanaRow>();
  for (const entry of kana) {
    const card = cardByKana.get(entry.id);
    const counts = card ? tally.get(card.id) : undefined;

    const row = rows.get(entry.row) ?? {
      row: entry.row,
      type: entry.type,
      items: [],
    };
    row.items.push({
      id: entry.id,
      character: entry.character,
      reading: entry.romaji,
      started: Boolean(card),
      known: card?.state === "review",
      reviews: counts?.reviews ?? 0,
      correct: counts?.correct ?? 0,
    });
    rows.set(entry.row, row);
  }

  return [...rows.values()];
}

export type WeakItem = {
  prompt: string;
  reading: string;
  reviews: number;
  correct: number;
  accuracy: number;
};

/**
 * The items that trip the learner up most.
 *
 * Cards with fewer than three reviews are excluded: one wrong answer out of
 * one is 0% accuracy and would crowd out the genuinely shaky items with
 * nothing more than noise.
 */
export async function getWeakItems(
  userId: string,
  locale: Locale,
  limit = 12,
): Promise<WeakItem[]> {
  const MIN_REVIEWS = 3;

  const [tally, cards] = await Promise.all([
    tallyByCard(userId),
    db.srsCard.findMany({
      where: { userId },
      include: { kana: true, word: true, kanji: true },
    }),
  ]);

  const items: WeakItem[] = [];
  for (const card of cards) {
    const counts = tally.get(card.id);
    if (!counts || counts.reviews < MIN_REVIEWS) continue;

    const accuracy = counts.correct / counts.reviews;
    if (accuracy === 1) continue;

    if (card.kana) {
      items.push({
        prompt: card.kana.character,
        reading: card.kana.romaji,
        ...counts,
        accuracy,
      });
    } else if (card.word) {
      const meanings = card.word.meanings as { de?: string[]; en?: string[] };
      items.push({
        prompt: card.word.written ?? card.word.reading,
        reading: meanings[locale]?.[0] ?? card.word.reading,
        ...counts,
        accuracy,
      });
    } else if (card.kanji) {
      const meanings = card.kanji.meanings as { de?: string[]; en?: string[] };
      items.push({
        prompt: card.kanji.character,
        reading: meanings[locale]?.[0] ?? meanings.en?.[0] ?? "",
        ...counts,
        accuracy,
      });
    }
  }

  return items.sort((a, b) => a.accuracy - b.accuracy).slice(0, limit);
}

/** Words the learner has started, most recently studied first. */
export async function getStartedWords(userId: string, locale: Locale) {
  const [cards, tally] = await Promise.all([
    db.srsCard.findMany({
      where: { userId, wordId: { not: null } },
      orderBy: [{ lastReviewAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { word: true },
    }),
    tallyByCard(userId),
  ]);

  return cards.flatMap((card) => {
    if (!card.word) return [];
    const meanings = card.word.meanings as { de?: string[]; en?: string[] };
    const counts = tally.get(card.id);

    return [{
      id: card.id,
      character: card.word.written ?? card.word.reading,
      reading: card.word.reading,
      meaning: meanings[locale]?.[0] ?? meanings.en?.[0] ?? "",
      level: card.word.jlptLevel,
      started: true,
      known: card.state === "review",
      reviews: counts?.reviews ?? 0,
      correct: counts?.correct ?? 0,
    }];
  });
}
