/**
 * KANJIDIC2 → Kanji
 *
 * Two things worth knowing:
 *
 * 1. Meanings exist in English, French, Spanish and Portuguese — **not in
 *    German**. `meanings.de` stays empty here and is filled in a separate
 *    step.
 * 2. `<jlpt>` uses the *old* four-step scale (4 = easiest), replaced by five
 *    levels in 2010. There is no clean conversion: the old level 2 was split
 *    into N2 and N3. The value therefore serves only as a rough signal;
 *    school grade and frequency drive the learning order, and both are
 *    reliable.
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
  // Meanings without an m_lang attribute are English.
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
    // Characters with no meaning at all are variants and curiosities —
    // worthless to learners and just noise in the kanji browser.
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
      // Raw value on the old scale. Conversion to N5–N1 happens in
      // scripts/import/jlpt.ts, where all characters are seen together.
      sourceJlpt: Number(first(xml, "jlpt")) || null,
    });

    if (batch.length >= 500) await flush();
  }
  await flush();

  const total = bar.done();
  const jouyou = await db.kanji.count({ where: { grade: { not: null } } });
  console.log(`    of which Jōyō kanji (with a school grade): ${jouyou}`);
  return total;
}
