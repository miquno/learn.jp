import "server-only";

import type { SrsRating } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { emptyCard, schedule } from "./scheduler";

/** Day key for DailyActivity — normalised to UTC midnight. */
function today(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function daysBetween(a: Date, b: Date) {
  return Math.round((today(b).getTime() - today(a).getTime()) / 86_400_000);
}

/**
 * Rates a card, writes the log and advances daily statistics and coins — all
 * in one transaction, so an aborted request can never advance a card without
 * logging it.
 */
export async function applyReview(
  userId: string,
  cardId: string,
  rating: SrsRating,
  durationMs?: number,
) {
  const card = await db.srsCard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new Error("Card not found");

  const now = new Date();
  const wasNew = card.state === "new";
  const { card: next, log } = schedule(card, rating, now);

  // Coins only for correct answers, and slightly more for new characters.
  // Wrong answers cost nothing — guessing shouldn't be punished, or nobody
  // guesses any more and everyone just clicks "again".
  const coins = rating === "again" ? 0 : wasNew ? 3 : 1;

  await db.$transaction([
    db.srsCard.update({ where: { id: cardId }, data: next }),
    db.reviewLog.create({
      data: { cardId, userId, rating, durationMs, reviewedAt: now, ...log },
    }),
    db.dailyActivity.upsert({
      where: { userId_date: { userId, date: today(now) } },
      create: {
        userId,
        date: today(now),
        reviews: 1,
        correct: rating === "again" ? 0 : 1,
        newItems: wasNew ? 1 : 0,
        seconds: Math.round((durationMs ?? 0) / 1000),
      },
      update: {
        reviews: { increment: 1 },
        correct: { increment: rating === "again" ? 0 : 1 },
        newItems: { increment: wasNew ? 1 : 0 },
        seconds: { increment: Math.round((durationMs ?? 0) / 1000) },
      },
    }),
    // The balance on the user is the running sum of the log. Both in the same
    // transaction so they cannot drift apart.
    ...(coins > 0
      ? [
          db.user.update({
            where: { id: userId },
            data: { coins: { increment: coins } },
          }),
          db.coinTransaction.create({
            data: { userId, delta: coins, reason: "review", refId: cardId },
          }),
        ]
      : []),
  ]);

  await updateStreak(userId, now);
  return { due: next.due, state: next.state };
}

/**
 * Advances the streak. Deliberately outside the transaction: a failure here
 * must not roll back an already answered card — a wrong number next to the
 * flame is the lesser evil compared to a lost answer.
 */
async function updateStreak(userId: string, now: Date) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lastStudyAt: true, currentStreak: true, longestStreak: true },
  });
  if (!user) return;

  const gap = user.lastStudyAt ? daysBetween(user.lastStudyAt, now) : null;
  if (gap === 0) {
    // Already studied today — only bump the timestamp.
    await db.user.update({ where: { id: userId }, data: { lastStudyAt: now } });
    return;
  }

  const current = gap === 1 ? user.currentStreak + 1 : 1;
  await db.user.update({
    where: { id: userId },
    data: {
      lastStudyAt: now,
      currentStreak: current,
      longestStreak: Math.max(current, user.longestStreak),
    },
  });
}

/**
 * Creates cards for new content. Content already started is skipped, so a
 * double click can't reset a card.
 */
export async function startKana(userId: string, kanaIds: string[]) {
  if (kanaIds.length === 0) return 0;

  const result = await db.srsCard.createMany({
    data: kanaIds.map((kanaId) => ({
      userId,
      itemType: "kana" as const,
      kanaId,
      ...emptyCard(),
    })),
    skipDuplicates: true,
  });

  return result.count;
}

export async function startWords(userId: string, wordIds: string[]) {
  if (wordIds.length === 0) return 0;

  const result = await db.srsCard.createMany({
    data: wordIds.map((wordId) => ({
      userId,
      itemType: "word" as const,
      wordId,
      ...emptyCard(),
    })),
    skipDuplicates: true,
  });

  return result.count;
}

export async function startGrammar(userId: string, grammarIds: string[]) {
  if (grammarIds.length === 0) return 0;

  const result = await db.srsCard.createMany({
    data: grammarIds.map((grammarId) => ({
      userId,
      itemType: "grammar" as const,
      grammarId,
      ...emptyCard(),
    })),
    skipDuplicates: true,
  });

  return result.count;
}
