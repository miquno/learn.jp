/**
 * KanjiVG → Kanji.strokeOrder
 *
 * The file holds SVG paths per character in writing order. It is the basis
 * for the stroke-order animation and the tracing game.
 *
 * The id carries the Unicode code point in hex (`kvg:kanji_065e5` → 日). Only
 * characters already in the database from KANJIDIC2 are filled in — KanjiVG
 * also contains digits, punctuation and kana.
 */
import { db } from "./lib/db";
import { openGzip, progress, streamElements } from "./lib/source";

function characterFrom(xml: string): string | null {
  const id = /<kanji id="kvg:kanji_([0-9a-f]+)"/.exec(xml)?.[1];
  if (!id) return null;
  const code = Number.parseInt(id, 16);
  return Number.isFinite(code) ? String.fromCodePoint(code) : null;
}

function paths(xml: string): string[] {
  const out: string[] = [];
  const re = /<path[^>]*\sd="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

export async function importKanjiVg() {
  const bar = progress("Stroke orders");

  // Only fill in known characters. An in-memory set saves ~11,000 individual
  // database queries.
  const known = new Set(
    (await db.kanji.findMany({ select: { character: true } })).map(
      (k) => k.character,
    ),
  );

  for await (const xml of streamElements(openGzip("kanjivg.xml.gz"), "kanji")) {
    const character = characterFrom(xml);
    if (!character || !known.has(character)) continue;

    const strokes = paths(xml);
    if (strokes.length === 0) continue;

    await db.kanji.update({
      where: { character },
      data: { strokeOrder: strokes },
    });
    bar.tick();
  }

  return bar.done(` of ${known.size} kanji`);
}
