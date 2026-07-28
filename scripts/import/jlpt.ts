/**
 * JLPT-Stufen zuordnen.
 *
 * Weder JMdict noch KANJIDIC2 liefern die heutigen Stufen: JMdict enthält
 * überhaupt keine, KANJIDIC2 nur die *alte* vierstufige Skala, die 2010 durch
 * fünf Stufen ersetzt wurde (das alte Level 2 wurde auf N2 und N3 aufgeteilt).
 * Offizielle Wortlisten veröffentlicht die JLPT-Organisation seit 2010 nicht
 * mehr; alle kursierenden Listen sind Rekonstruktionen mit unklarer Herkunft
 * und Lizenz.
 *
 * Deshalb wird abgeleitet — aus Daten, die wir sauber lizenziert haben:
 *
 *   Kanji: nach Schuljahr und Häufigkeit sortiert, dann auf die allgemein
 *   dokumentierten Stufengrößen aufgeteilt (N5 103, N4 181, N3 370, N2 380,
 *   N1 1136 Zeichen). Wo KANJIDIC2 eine alte Stufe kennt, hat sie Vorrang.
 *
 *   Wörter: die Stufe ist das Schwerere aus (a) der Häufigkeit und (b) der
 *   schwierigsten enthaltenen Kanji-Stufe. Ein Wort kann nicht leichter sein
 *   als das schwerste Zeichen, aus dem es besteht — 「憂鬱」 ist kein
 *   N5-Wort, egal wie häufig es vorkommt.
 *
 * Das ist eine Näherung, keine amtliche Einstufung. Sie ist gut genug, um die
 * Lernreihenfolge und die Fortschrittsanzeige zu tragen, und kann später
 * jederzeit durch eine kuratierte Liste ersetzt werden — die Stufe steht in
 * genau einer Spalte je Tabelle.
 *
 * Bekannte Schwäche bei Wörtern: JMdicts Häufigkeitsdaten stammen aus einem
 * Zeitungskorpus (Mainichi Shimbun). Politik- und Verwaltungsvokabular ist
 * darin überrepräsentiert, weshalb 「安保」 (Sicherheitsvertrag) und
 * 「委員長」 (Ausschussvorsitzender) auf N5 landen, obwohl sie in keinem
 * Anfängerkurs vorkommen. Die Kanji-Einstufung ist davon nicht betroffen —
 * sie stimmt mit den veröffentlichten Listen praktisch überein. Für den
 * Wortschatz der ersten beiden Stufen lohnt sich später eine kuratierte
 * Liste; ab N3 ist die Näherung unkritisch.
 */
import type { JlptLevel } from "../../src/generated/prisma/enums";

import { db } from "./lib/db";
import { progress } from "./lib/source";

const LEVELS: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

/** Übliche Zeichenzahlen je Stufe, kumulativ gelesen. */
const KANJI_PER_LEVEL: Record<JlptLevel, number> = {
  N5: 103,
  N4: 181,
  N3: 370,
  N2: 380,
  N1: 1136,
};

/** Häufigkeitsgrenzen für Wörter (JMdict-Rang, kleiner = häufiger). */
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

  // Nur Zeichen, die überhaupt für den JLPT infrage kommen: Jōyō-Kanji oder
  // solche mit alter JLPT-Stufe. Der Rest bleibt ohne Stufe — das sind
  // Namenszeichen und Seltenheiten, die in keiner Prüfung vorkommen.
  // Erst alles zurücksetzen. Es gibt mehr Kandidaten als Plätze in den
  // Stufen; ohne das Zurücksetzen behielten die Übriggebliebenen ihre Stufe
  // aus dem vorherigen Lauf und die Verteilung wüchse bei jedem Aufruf.
  await db.kanji.updateMany({ data: { jlptLevel: null } });

  const candidates = await db.kanji.findMany({
    where: { OR: [{ grade: { not: null } }, { sourceJlpt: { not: null } }] },
    select: { id: true, grade: true, frequency: true, sourceJlpt: true },
    // Ohne ORDER BY ist die Reihenfolge aus Postgres beliebig — bei
    // Gleichstand fiele die Einteilung sonst je Lauf anders aus.
    orderBy: { character: "asc" },
  });

  // Sortierung nach Lernreihenfolge. Die alte KANJIDIC2-Stufe stammt aus den
  // echten Listen vor 2010 und ist das stärkste Signal — sie darf die
  // Einteilung aber nicht *überschreiben*, sonst landet fast nichts auf N3:
  // die alte Skala kannte diese Stufe gar nicht, N3 entstand erst durch das
  // Aufteilen des alten Levels 2.
  // Alte Skala: 4 ist die leichteste Stufe, 1 die schwerste, kein Wert = am
  // schwersten. Umgedreht ergibt das die Lernreihenfolge.
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
  const bar = progress("Wörter");

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

  // Nach Stufe gruppiert aktualisieren: fünf Massenoperationen statt
  // 30.000 Einzelabfragen.
  const buckets = new Map<JlptLevel, string[]>(
    LEVELS.map((level) => [level, []]),
  );

  for (const word of words) {
    const frequency = word.frequency;
    const band = frequency === null
      ? undefined
      : WORD_FREQUENCY_BANDS.find(([, max]) => frequency <= max);
    const byFrequency: JlptLevel = band ? band[0] : "N1";

    // Schwierigstes enthaltenes Zeichen.
    let byKanji: JlptLevel | null = null;
    for (const char of word.written ?? "") {
      const kanjiLevel = kanjiLevels.get(char);
      if (kanjiLevel) byKanji = byKanji ? harder(byKanji, kanjiLevel) : kanjiLevel;
      // Ein Zeichen ganz ohne Stufe ist Fachvokabular oder Namensmaterial.
      else if (/[一-龯]/.test(char)) byKanji = "N1";
    }

    // Die Schrift darf ein Wort anheben, aber höchstens um eine Stufe.
    // Grund: im JLPT wird Grundwortschatz oft in Kana geschrieben. 「時間」
    // besteht aus Zeichen, die einzeln später drankommen, ist als Wort aber
    // Anfängerstoff — die harte Regel "nie leichter als das schwerste
    // Zeichen" hat es auf N2 geschoben und N5 auf 181 Wörter schrumpfen
    // lassen.
    // Für den absoluten Grundwortschatz zählt die Schrift gar nicht: 「私」,
    // 「時間」 und 「学校」 stehen in jedem Anfängerbuch der ersten Wochen,
    // obwohl ihre Zeichen einzeln später drankommen. Ohne diese Ausnahme
    // blieben nur 181 Wörter auf N5 übrig — die veröffentlichte N5-Liste
    // umfasst rund 800.
    const isCoreVocabulary = frequency !== null && frequency <= 1000;

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

  console.log("\n  Verteilung");
  for (const level of LEVELS) {
    const [words, kanji] = await Promise.all([
      db.word.count({ where: { jlptLevel: level } }),
      db.kanji.count({ where: { jlptLevel: level } }),
    ]);
    console.log(
      `    ${level}  ${words.toLocaleString("de-DE").padStart(6)} Wörter   ${kanji
        .toLocaleString("de-DE")
        .padStart(5)} Kanji`,
    );
  }
}
