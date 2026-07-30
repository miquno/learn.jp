/**
 * Coverage and quality report for the imported content.
 *
 *   npm run import:stats
 *
 * Purpose: after every import, show where the gaps are — above all German
 * coverage, which varies a lot by source and in one case (kanji meanings) is
 * missing entirely.
 */
import { db } from "./lib/db";

function bar(part: number, total: number, width = 24) {
  const share = total === 0 ? 0 : part / total;
  const filled = Math.round(share * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)} ${(share * 100)
    .toFixed(1)
    .padStart(5)}%`;
}

function line(label: string, part: number, total: number) {
  console.log(
    `  ${label.padEnd(30)} ${part.toLocaleString("en-GB").padStart(9)} / ${total
      .toLocaleString("en-GB")
      .padStart(9)}  ${bar(part, total)}`,
  );
}

async function main() {
  const [kana, words, kanji, sentences] = await Promise.all([
    db.kana.count(),
    db.word.count(),
    db.kanji.count(),
    db.sentence.count(),
  ]);

  console.log("\nInventory");
  console.log(`  Kana                ${kana.toLocaleString("en-GB")}`);
  console.log(`  Words               ${words.toLocaleString("en-GB")}`);
  console.log(`  Kanji               ${kanji.toLocaleString("en-GB")}`);
  console.log(`  Example sentences   ${sentences.toLocaleString("en-GB")}`);

  // Raw SQL for the JSON columns: Prisma's JSON filters require a scalar
  // filter at the path and express "key present and non-empty" only
  // awkwardly.
  const count = async (sql: string) => {
    const rows = await db.$queryRawUnsafe<{ n: bigint }[]>(sql);
    return Number(rows[0].n);
  };

  console.log("\nGerman coverage");
  const [wordsDe, kanjiDe, sentencesDe] = await Promise.all([
    count(`select count(*) as n from words where jsonb_array_length(meanings->'de') > 0`),
    count(`select count(*) as n from kanji where jsonb_array_length(meanings->'de') > 0`),
    count(`select count(*) as n from sentences where translations ? 'de'`),
  ]);
  line("Words with a meaning", wordsDe, words);
  line("Kanji with a meaning", kanjiDe, kanji);
  line("Sentences with translation", sentencesDe, sentences);

  console.log("\nCompleteness");
  const [strokes, jouyou, wordsJlpt, kanjiJlpt] = await Promise.all([
    count(`select count(*) as n from kanji where "strokeOrder" is not null`),
    db.kanji.count({ where: { grade: { not: null } } }),
    db.word.count({ where: { jlptLevel: { not: null } } }),
    db.kanji.count({ where: { jlptLevel: { not: null } } }),
  ]);
  line("Kanji with stroke order", strokes, kanji);
  line("Kanji with a school grade", jouyou, kanji);
  line("Words with a JLPT level", wordsJlpt, words);
  line("Kanji with a JLPT level", kanjiJlpt, kanji);

  console.log("\nMost common words per word class");
  for (const wordClass of ["godan", "ichidan", "i_adjective", "na_adjective"] as const) {
    const sample = await db.word.findMany({
      where: { wordClass, frequency: { not: null } },
      orderBy: { frequency: "asc" },
      take: 4,
      select: { written: true, reading: true, meanings: true },
    });
    const shown = sample
      .map((w) => {
        const de = (w.meanings as { de?: string[] }).de?.[0];
        return `${w.written ?? w.reading} (${de ?? "—"})`;
      })
      .join(", ");
    console.log(`  ${wordClass.padEnd(14)} ${shown}`);
  }

  const gaps: string[] = [];
  if (kanjiDe === 0) {
    gaps.push(
      "German kanji meanings are missing entirely — KANJIDIC2 ships no German.",
    );
  }
  if (wordsJlpt === 0) {
    gaps.push(
      "No word carries a JLPT level — JMdict contains none, assignment needs its own step.",
    );
  }
  if (gaps.length > 0) {
    console.log("\nOpen gaps");
    for (const gap of gaps) console.log(`  · ${gap}`);
  }

  console.log();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
