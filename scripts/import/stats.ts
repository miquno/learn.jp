/**
 * Abdeckungs- und Qualitätsbericht über die importierten Inhalte.
 *
 *   npm run import:stats
 *
 * Zweck: nach jedem Import zeigen, wo Lücken sind — vor allem die deutsche
 * Abdeckung, weil sie je nach Quelle stark schwankt und in einem Fall
 * (Kanji-Bedeutungen) komplett fehlt.
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
    `  ${label.padEnd(30)} ${part.toLocaleString("de-DE").padStart(9)} / ${total
      .toLocaleString("de-DE")
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

  console.log("\nBestand");
  console.log(`  Kana                ${kana.toLocaleString("de-DE")}`);
  console.log(`  Wörter              ${words.toLocaleString("de-DE")}`);
  console.log(`  Kanji               ${kanji.toLocaleString("de-DE")}`);
  console.log(`  Beispielsätze       ${sentences.toLocaleString("de-DE")}`);

  // Für die JSON-Spalten direkt SQL: Prismas JSON-Filter verlangen einen
  // Skalar-Filter am Pfad und drücken „Schlüssel ist vorhanden und nicht
  // leer" nur umständlich aus.
  const count = async (sql: string) => {
    const rows = await db.$queryRawUnsafe<{ n: bigint }[]>(sql);
    return Number(rows[0].n);
  };

  console.log("\nDeutsche Abdeckung");
  const [wordsDe, kanjiDe, sentencesDe] = await Promise.all([
    count(`select count(*) as n from words where jsonb_array_length(meanings->'de') > 0`),
    count(`select count(*) as n from kanji where jsonb_array_length(meanings->'de') > 0`),
    count(`select count(*) as n from sentences where translations ? 'de'`),
  ]);
  line("Wörter mit Bedeutung", wordsDe, words);
  line("Kanji mit Bedeutung", kanjiDe, kanji);
  line("Sätze mit Übersetzung", sentencesDe, sentences);

  console.log("\nVollständigkeit");
  const [strokes, jouyou, wordsJlpt, kanjiJlpt] = await Promise.all([
    count(`select count(*) as n from kanji where "strokeOrder" is not null`),
    db.kanji.count({ where: { grade: { not: null } } }),
    db.word.count({ where: { jlptLevel: { not: null } } }),
    db.kanji.count({ where: { jlptLevel: { not: null } } }),
  ]);
  line("Kanji mit Strichfolge", strokes, kanji);
  line("Kanji mit Schuljahr (Jōyō)", jouyou, kanji);
  line("Wörter mit JLPT-Stufe", wordsJlpt, words);
  line("Kanji mit JLPT-Stufe", kanjiJlpt, kanji);

  console.log("\nHäufigste Wörter je Wortklasse");
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
      "Kanji-Bedeutungen auf Deutsch fehlen vollständig — KANJIDIC2 liefert kein Deutsch.",
    );
  }
  if (wordsJlpt === 0) {
    gaps.push(
      "Kein Wort trägt eine JLPT-Stufe — JMdict enthält keine, die Zuordnung braucht einen eigenen Schritt.",
    );
  }
  if (gaps.length > 0) {
    console.log("\nOffene Lücken");
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
