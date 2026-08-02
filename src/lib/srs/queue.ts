import "server-only";

import type { SrsItemType } from "@/generated/prisma/enums";
import type { FuriToken } from "@/lib/furigana";
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
  /** One example sentence, for word cards. */
  example: { japanese: string; tokens: FuriToken[]; translation: string | null } | null;
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

type LinkedSentence = {
  sentence: { japanese: string; translations: unknown };
};

function exampleOf(links: LinkedSentence[], locale: Locale) {
  const first = links[0]?.sentence;
  if (!first) return null;
  const translations = first.translations as Record<string, string> | null;
  return {
    japanese: first.japanese,
    tokens: [] as FuriToken[],
    translation: translations?.[locale] ?? null,
  };
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
    include: {
      kana: true,
      kanji: true,
      // One example is enough on a card; loading all eight would be wasted
      // bytes on every review.
      word: { include: { sentences: { take: 1, include: { sentence: true } } } },
      grammar: true,
    },
  });

  return cards.flatMap((card) => {
    if (card.kana) {
      return [{
        cardId: card.id,
        itemType: card.itemType,
        prompt: card.kana.character,
        reading: card.kana.romaji,
        meaning: null,
        example: null,
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
        example: exampleOf(card.word.sentences, locale),
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
        example: null,
        isNew: card.state === "new",
      }];
    }
    if (card.grammar) {
      const meanings = card.grammar.meaning as { de?: string; en?: string };
      const examples = card.grammar.examples as {
        japanese: string;
        tokens?: FuriToken[];
        translations: Record<string, string>;
      }[];
      const first = examples[0];
      return [{
        cardId: card.id,
        itemType: card.itemType,
        prompt: card.grammar.title,
        // The "reading" slot carries the meaning for grammar — it's what gets
        // revealed as the answer.
        reading: meanings[locale] ?? meanings.en ?? "",
        meaning: card.grammar.structure,
        example: first
          ? {
              japanese: first.japanese,
              tokens: first.tokens ?? [],
              translation: first.translations[locale] ?? null,
            }
          : null,
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

/**
 * The next words not yet started, in learning order: easiest JLPT level
 * first, and within a level the most frequent words first. That is the order
 * a course would teach them in.
 *
 * Only words that have an example sentence are offered — a vocabulary card
 * without one teaches the word in isolation, which is how people forget it.
 */
export async function getNextWords(userId: string, limit: number) {
  const started = await db.srsCard.findMany({
    where: { userId, wordId: { not: null } },
    select: { wordId: true },
  });
  const startedIds = started
    .map((card) => card.wordId)
    .filter((id): id is string => id !== null);

  return db.word.findMany({
    where: {
      id: { notIn: startedIds },
      jlptLevel: { not: null },
      sentences: { some: {} },
    },
    // Ascending, because the enum is declared N5 → N1: the *first* value is
    // the easiest level. Sorting the other way opens the first lesson with
    // 時期尚早 and 露骨, which is exactly wrong for a beginner.
    orderBy: [{ jlptLevel: "asc" }, { frequency: "asc" }],
    take: limit,
    include: { sentences: { take: 1, include: { sentence: true } } },
  });
}

/**
 * Whether vocabulary is unlocked yet.
 *
 * The rule is "every hiragana has been started", not "every hiragana is
 * mastered". Mastery takes days of reviews, and blocking all vocabulary
 * behind that is the kind of gate people quit over. Having seen every
 * character once is enough to start reading words.
 *
 * Katakana deliberately does not gate anything: it is mostly loanwords and
 * can be learned alongside.
 */
export async function isVocabularyUnlocked(userId: string) {
  const [hiragana, started] = await Promise.all([
    db.kana.count({ where: { script: "hiragana" } }),
    db.srsCard.count({
      where: { userId, kana: { script: "hiragana" } },
    }),
  ]);

  return { unlocked: started >= hiragana, started, total: hiragana };
}

/**
 * The next grammar points not yet started, in teaching order.
 *
 * Only reviewed points are offered — a machine-drafted explanation that a
 * human hasn't checked must never reach a learner (see scripts/import/grammar.ts).
 */
export async function getNextGrammar(userId: string, limit: number) {
  const started = await db.srsCard.findMany({
    where: { userId, grammarId: { not: null } },
    select: { grammarId: true },
  });
  const startedIds = started
    .map((card) => card.grammarId)
    .filter((id): id is string => id !== null);

  return db.grammarPoint.findMany({
    where: {
      id: { notIn: startedIds },
      reviewed: true,
      jlptLevel: { not: undefined },
    },
    orderBy: [{ jlptLevel: "asc" }, { order: "asc" }],
    take: limit,
  });
}

/**
 * Whether grammar is unlocked. Same rule as vocabulary: once every hiragana
 * has been started, the learner can read the example sentences.
 */
export async function isGrammarUnlocked(userId: string) {
  return isVocabularyUnlocked(userId);
}
