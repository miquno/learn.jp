import "server-only";

import type { SrsRating } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { emptyCard, schedule } from "./scheduler";

/** Tagesschlüssel für DailyActivity — auf UTC-Mitternacht normalisiert. */
function today(now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function daysBetween(a: Date, b: Date) {
  return Math.round((today(b).getTime() - today(a).getTime()) / 86_400_000);
}

/**
 * Bewertet eine Karte, schreibt das Protokoll und rechnet Tagesstatistik und
 * Serie fort — alles in einer Transaktion, damit eine abgebrochene Anfrage
 * keine Karte fortschreibt, ohne sie zu protokollieren.
 */
export async function applyReview(
  userId: string,
  cardId: string,
  rating: SrsRating,
  durationMs?: number,
) {
  const card = await db.srsCard.findFirst({ where: { id: cardId, userId } });
  if (!card) throw new Error("Karte nicht gefunden");

  const now = new Date();
  const wasNew = card.state === "new";
  const { card: next, log } = schedule(card, rating, now);

  // Münzen nur für richtige Antworten, und für neue Zeichen etwas mehr.
  // Falsche Antworten kosten nichts — Lernende sollen raten dürfen, ohne
  // dafür bestraft zu werden.
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
    // Der Kontostand am Nutzer ist die laufende Summe des Protokolls. Beides
    // in derselben Transaktion, damit sie nicht auseinanderlaufen können.
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
 * Serie fortschreiben. Bewusst außerhalb der Transaktion: ein Fehler hier
 * darf keine bereits beantwortete Karte zurückrollen — eine falsche Zahl
 * neben dem Feuersymbol ist das kleinere Übel als eine verlorene Antwort.
 */
async function updateStreak(userId: string, now: Date) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { lastStudyAt: true, currentStreak: true, longestStreak: true },
  });
  if (!user) return;

  const gap = user.lastStudyAt ? daysBetween(user.lastStudyAt, now) : null;
  if (gap === 0) {
    // Heute schon gelernt — nur den Zeitstempel nachziehen.
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
 * Legt Karten für neue Inhalte an. Bereits begonnene Inhalte werden
 * übersprungen, damit ein doppelter Klick keine Karte zurücksetzt.
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
