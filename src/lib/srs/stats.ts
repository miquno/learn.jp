import "server-only";

import { db } from "@/lib/db";

/** Wie viele Wochen die Aktivitätskarte zeigt. */
export const HEATMAP_WEEKS = 26;

export type ActivityDay = { date: string; reviews: number };

function utcMidnight(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Tagesaktivität für die Heatmap, lückenlos aufgefüllt.
 *
 * Die Datenbank kennt nur Tage mit Aktivität. Für ein gleichmäßiges Raster
 * braucht die Anzeige aber jeden Tag, auch die leeren — das Auffüllen hier
 * spart der Komponente jede Datumsrechnung.
 */
export async function getActivity(userId: string): Promise<ActivityDay[]> {
  const today = utcMidnight(new Date());
  // Auf den zurückliegenden Sonntag ausrichten, damit die Spalten Wochen sind.
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (HEATMAP_WEEKS * 7 - 1) - today.getUTCDay());

  const rows = await db.dailyActivity.findMany({
    where: { userId, date: { gte: start } },
    select: { date: true, reviews: true },
  });

  const byDate = new Map(
    rows.map((row) => [row.date.toISOString().slice(0, 10), row.reviews]),
  );

  const days: ActivityDay[] = [];
  for (
    let cursor = new Date(start);
    cursor <= today;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({ date: key, reviews: byDate.get(key) ?? 0 });
  }
  return days;
}

export async function getDashboardStats(userId: string) {
  const [due, known, totals, kanaByScript, startedKana] = await Promise.all([
    db.srsCard.count({ where: { userId, due: { lte: new Date() } } }),
    db.srsCard.count({ where: { userId, state: "review" } }),
    db.dailyActivity.aggregate({
      where: { userId },
      _sum: { reviews: true, correct: true },
    }),
    db.kana.groupBy({ by: ["script"], _count: true }),
    db.srsCard.findMany({
      where: { userId, kanaId: { not: null } },
      select: { state: true, kana: { select: { script: true } } },
    }),
  ]);

  const reviews = totals._sum.reviews ?? 0;
  const correct = totals._sum.correct ?? 0;

  const scriptTotals = Object.fromEntries(
    kanaByScript.map((row) => [row.script, row._count]),
  ) as Record<"hiragana" | "katakana", number>;

  // Als "beherrscht" zählt, was die Lernphase verlassen hat — sonst stünde
  // der Balken nach der ersten Lektion schon bei 100 %.
  const scriptKnown = { hiragana: 0, katakana: 0 };
  for (const card of startedKana) {
    if (card.state === "review" && card.kana) {
      scriptKnown[card.kana.script] += 1;
    }
  }

  return {
    due,
    known,
    reviews,
    accuracy: reviews === 0 ? null : Math.round((correct / reviews) * 100),
    kana: {
      hiragana: {
        known: scriptKnown.hiragana,
        total: scriptTotals.hiragana ?? 0,
      },
      katakana: {
        known: scriptKnown.katakana,
        total: scriptTotals.katakana ?? 0,
      },
    },
  };
}
