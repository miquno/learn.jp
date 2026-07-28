/**
 * KANJIDIC2 → Kanji
 *
 * Zwei Dinge, die man wissen muss:
 *
 * 1. Bedeutungen gibt es auf Englisch, Französisch, Spanisch und
 *    Portugiesisch — **nicht auf Deutsch**. `meanings.de` bleibt hier leer
 *    und wird in einem eigenen Schritt gefüllt.
 * 2. `<jlpt>` benutzt die *alte* vierstufige Skala (4 = leichteste Stufe),
 *    die 2010 durch fünf Stufen ersetzt wurde. Eine saubere Umrechnung gibt
 *    es nicht: das alte Level 2 wurde auf N2 und N3 aufgeteilt. Der Wert
 *    dient deshalb nur als grobe Einordnung; für die Lernreihenfolge zählen
 *    Schuljahr (`grade`) und Häufigkeit (`freq`), die beide verlässlich sind.
 */
import { db } from "./lib/db";
import { all, first, openGzip, progress, streamElements } from "./lib/source";

function readings(xml: string, type: "ja_on" | "ja_kun"): string[] {
  const out: string[] = [];
  const re = new RegExp(
    `<reading r_type="${type}"[^>]*>([^<]*)</reading>`,
    "g",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

function meaningsEn(xml: string): string[] {
  // Bedeutungen ohne m_lang-Attribut sind englisch.
  const out: string[] = [];
  const re = /<meaning>([^<]*)<\/meaning>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

type KanjiRow = {
  character: string;
  meanings: { de: string[]; en: string[] };
  onyomi: string[];
  kunyomi: string[];
  strokeCount: number;
  grade: number | null;
  frequency: number | null;
  sourceJlpt: number | null;
};

export async function importKanjidic() {
  const bar = progress("Kanji");
  let batch: KanjiRow[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await db.kanji.createMany({ data: batch, skipDuplicates: true });
    bar.tick(batch.length);
    batch = [];
  };

  for await (const xml of streamElements(
    openGzip("kanjidic2.xml.gz"),
    "character",
  )) {
    const character = first(xml, "literal");
    const strokeCount = Number(all(xml, "stroke_count")[0]);
    if (!character || !Number.isFinite(strokeCount)) continue;

    const en = meaningsEn(xml);
    // Zeichen ohne jede Bedeutung sind Varianten und Kuriosa — für Lernende
    // wertlos und im Kanji-Browser nur Rauschen.
    if (en.length === 0) continue;

    const grade = Number(first(xml, "grade"));
    const freq = Number(first(xml, "freq"));

    batch.push({
      character,
      meanings: { de: [], en },
      onyomi: readings(xml, "ja_on"),
      kunyomi: readings(xml, "ja_kun"),
      strokeCount,
      grade: Number.isFinite(grade) ? grade : null,
      frequency: Number.isFinite(freq) ? freq : null,
      // Rohwert der alten Skala. Die Umrechnung auf N5–N1 passiert in
      // scripts/import/jlpt.ts, wo alle Zeichen im Zusammenhang stehen.
      sourceJlpt: Number(first(xml, "jlpt")) || null,
    });

    if (batch.length >= 500) await flush();
  }
  await flush();

  const total = bar.done();
  const jouyou = await db.kanji.count({ where: { grade: { not: null } } });
  console.log(`    davon Jōyō-Kanji (mit Schuljahr): ${jouyou}`);
  return total;
}
