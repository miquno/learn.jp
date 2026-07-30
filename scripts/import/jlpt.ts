/**
 * Assign JLPT levels.
 *
 * Neither JMdict nor KANJIDIC2 provides today's levels: JMdict contains none
 * at all, KANJIDIC2 only the *old* four-step scale that was replaced by five
 * levels in 2010 (the old level 2 was split into N2 and N3). The JLPT
 * organisation has not published official word lists since 2010; every list in
 * circulation is a reconstruction with unclear provenance and licensing.
 *
 * So the levels are derived — from data we have cleanly licensed:
 *
 *   Kanji: sorted by school grade and frequency, then split into the commonly
 *   documented level sizes (N5 103, N4 181, N3 370, N2 380, N1 1136
 *   characters). The old KANJIDIC2 level acts as the primary sort key.
 *
 *   Words: the level is the harder of (a) frequency and (b) the hardest kanji
 *   contained, capped at one step above the frequency band.
 *
 * This is an approximation, not an official classification. It is good enough
 * to carry learning order and the progress display, and can be replaced by a
 * curated list at any time — the level lives in exactly one column per table.
 *
 * Known weakness for words: JMdict's frequency data comes from a newspaper
 * corpus (Mainichi Shimbun). Political and administrative vocabulary is
 * over-represented there, which is why 「安保」 (security treaty) and
 * 「委員長」 (committee chairman) land on N5 even though they appear in no
 * beginner course. The kanji classification is unaffected — it matches the
 * published lists almost exactly. A curated list is worth it for the
 * vocabulary of the first two levels; from N3 upwards the approximation is
 * harmless.
 */
import type { JlptLevel } from "../../src/generated/prisma/enums";

import { db } from "./lib/db";
import { progress } from "./lib/source";

const LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

/** Usual character counts per level. */
const KANJI_PER_LEVEL: Record<JlptLevel, number> = {
  N5: 103,
  N4: 181,
  N3: 370,
  N2: 380,
  N1: 1136,
};

/** Frequency bands for words (JMdict rank, lower = more common). */
const WORD_FREQUENCY_BANDS: [JlptLevel, number][] = [
  ["N5", 1500],
  ["N4", 3000],
  ["N3", 6000],
  ["N2", 10000],
];

const harder = (a: JlptLevel, b: JlptLevel) =>
  LEVELS.indexOf(a) > LEVELS.indexOf(b) ? a : b;

async function assignKanji() {
  const bar = progress("Kanji");

  // Reset everything first. There are more candidates than slots in the
  // levels; without the reset the leftovers would keep their level from the
  // previous run and the distribution would grow on every invocation.
  await db.kanji.updateMany({ data: { jlptLevel: null } });

  // Only characters that can appear in the JLPT at all: Jōyō kanji or ones
  // with an old JLPT level. The rest stays without a level — those are name
  // characters and rarities that appear in no exam.
  const candidates = await db.kanji.findMany({
    where: { OR: [{ grade: { not: null } }, { sourceJlpt: { not: null } }] },
    select: { id: true, grade: true, frequency: true, sourceJlpt: true },
    // Without ORDER BY the order from Postgres is arbitrary — on ties the
    // split would otherwise come out differently on every run.
    orderBy: { character: "asc" },
  });

  // The old KANJIDIC2 level comes from the real pre-2010 lists and is the
  // strongest signal — but it must not *override* the split, or almost nothing
  // lands on N3: the old scale had no such level, N3 only came into being when
  // the old level 2 was split.
  //
  // On that scale 4 is the easiest level, 1 the hardest and no value hardest
  // of all. Inverted, that gives the learning order.
  const oldRank = (value: number | null) => (value === null ? 5 : 4 - value);

  candidates.sort((a, b) => {
    const rank = oldRank(a.sourceJlpt) - oldRank(b.sourceJlpt);
    if (rank !== 0) return rank;
    const grade = (a.grade ?? 9) - (b.grade ?? 9);
    if (grade !== 0) return grade;
    return (a.frequency ?? 99999) - (b.frequency ?? 99999);
  });

  let index = 0;
  const updates: { id: string; level: JlptLevel }[] = [];

  for (const level of LEVELS) {
    const size = KANJI_PER_LEVEL[level];
    for (let taken = 0; taken < size && index < candidates.length; index += 1) {
      updates.push({ id: candidates[index].id, level });
      taken += 1;
    }
  }

  for (const { id, level } of updates) {
    await db.kanji.update({ where: { id }, data: { jlptLevel: level } });
    bar.tick();
  }

  return bar.done();
}

async function assignWords() {
  const bar = progress("Words");

  const kanjiLevels = new Map<string, JlptLevel>();
  for (const kanji of await db.kanji.findMany({
    where: { jlptLevel: { not: null } },
    select: { character: true, jlptLevel: true },
  })) {
    kanjiLevels.set(kanji.character, kanji.jlptLevel as JlptLevel);
  }

  const words = await db.word.findMany({
    select: { id: true, written: true, frequency: true },
  });

  // Update grouped by level: five bulk operations instead of 30,000
  // individual queries.
  const buckets = new Map<JlptLevel, string[]>(
    LEVELS.map((level) => [level, []]),
  );

  for (const word of words) {
    const frequency = word.frequency;
    const band = frequency === null
      ? undefined
      : WORD_FREQUENCY_BANDS.find(([, max]) => frequency <= max);
    const byFrequency: JlptLevel = band ? band[0] : "N1";

    // Hardest character contained.
    let byKanji: JlptLevel | null = null;
    for (const char of word.written ?? "") {
      const kanjiLevel = kanjiLevels.get(char);
      if (kanjiLevel) byKanji = byKanji ? harder(byKanji, kanjiLevel) : kanjiLevel;
      // A character with no level at all is technical or name material.
      else if (/[一-龯]/.test(char)) byKanji = "N1";
    }

    // For the absolute core vocabulary the writing doesn't count at all:
    // 「私」, 「時間」 and 「学校」 appear in the first weeks of every beginner
    // book even though their characters come up individually much later.
    const isCoreVocabulary = frequency !== null && frequency <= 1000;

    // Otherwise the writing may raise a word, but by at most one step: in the
    // JLPT, basic vocabulary is often written in kana. The hard rule "never
    // easier than the hardest character" pushed 「時間」 to N2 and shrank N5
    // to 181 words.
    let level = byFrequency;
    if (byKanji && !isCoreVocabulary) {
      const capped = Math.min(
        LEVELS.indexOf(byKanji),
        LEVELS.indexOf(byFrequency) + 1,
      );
      level = harder(byFrequency, LEVELS[capped]);
    }

    buckets.get(level)!.push(word.id);
  }

  for (const [level, ids] of buckets) {
    for (let i = 0; i < ids.length; i += 5000) {
      await db.word.updateMany({
        where: { id: { in: ids.slice(i, i + 5000) } },
        data: { jlptLevel: level },
      });
      bar.tick(Math.min(5000, ids.length - i));
    }
  }

  return bar.done();
}

export async function assignJlptLevels() {
  await assignKanji();
  await assignWords();

  console.log("\n  Distribution");
  for (const level of LEVELS) {
    const [words, kanji] = await Promise.all([
      db.word.count({ where: { jlptLevel: level } }),
      db.kanji.count({ where: { jlptLevel: level } }),
    ]);
    console.log(
      `    ${level}  ${words.toLocaleString("en-GB").padStart(6)} words   ${kanji
        .toLocaleString("en-GB")
        .padStart(5)} kanji`,
    );
  }
}
