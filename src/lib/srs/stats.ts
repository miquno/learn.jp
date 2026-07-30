import "server-only";

import { db } from "@/lib/db";

/** How many weeks the activity heatmap shows. */
export const HEATMAP_WEEKS = 26;

export type ActivityDay = { date: string; reviews: number };

function utcMidnight(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Daily activity for the heatmap, filled in without gaps.
 *
 * The database only knows days with activity. For an even grid the view needs
 * every day, including the empty ones — filling them here saves the component
 * all date arithmetic.
 */
export async function getActivity(userId: string): Promise<ActivityDay[]> {
  const today = utcMidnight(new Date());
  // Align to the preceding Sunday so the columns are weeks.
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

  // Something counts as mastered once it has left the learning phase —
  // otherwise the bar would sit at 100% after the very first lesson.
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
