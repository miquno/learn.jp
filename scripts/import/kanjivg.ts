/**
 * KanjiVG → Kanji.strokeOrder
 *
 * Die Datei enthält pro Zeichen SVG-Pfade in Schreibreihenfolge. Sie ist die
 * Grundlage für die Strichfolge-Animation und für das Nachzeichnen-Spiel.
 *
 * Die ID trägt den Unicode-Codepoint hexadezimal (`kvg:kanji_065e5` → 日).
 * Nur Zeichen, die schon aus KANJIDIC2 in der Datenbank stehen, werden
 * ergänzt — KanjiVG enthält auch Ziffern, Satzzeichen und Kana.
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
  const bar = progress("Strichfolgen");

  // Nur bekannte Zeichen ergänzen. Ein Set im Speicher spart ~11.000
  // Einzelabfragen gegen die Datenbank.
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

  return bar.done(` von ${known.size} Kanji`);
}
