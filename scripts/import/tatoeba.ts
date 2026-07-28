/**
 * Tatoeba → Sentence
 *
 * Format: `id \t sprache \t text` für Sätze, `jpn_id \t anderer_id` für
 * Verknüpfungen. Es gibt 248.821 japanische Sätze, davon 58.352 mit
 * deutscher und 280.610 Verknüpfungen mit englischer Übersetzung (mehrere
 * Übersetzungen je Satz sind möglich — genommen wird die erste).
 *
 * Importiert werden nur Sätze mit mindestens einer Übersetzung: ein
 * japanischer Satz ohne Bedeutung nützt Lernenden nichts.
 */
import { createInterface } from "node:readline";

import { db } from "./lib/db";
import { openBzip2, progress } from "./lib/source";

const KANJI = /[一-龯㐀-䶿]/g;

async function* lines(file: string) {
  const rl = createInterface({
    input: openBzip2(file),
    crlfDelay: Infinity,
  });
  for await (const line of rl) yield line;
}

/** jpn-ID → ID der Übersetzung. Erste gewinnt. */
async function readLinks(file: string): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  for await (const line of lines(file)) {
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const from = Number(line.slice(0, tab));
    if (!map.has(from)) map.set(from, Number(line.slice(tab + 1)));
  }
  return map;
}

/** Texte der benötigten IDs — der Rest wird gar nicht erst behalten. */
async function readSentences(
  file: string,
  wanted: Set<number>,
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  for await (const line of lines(file)) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;
    const id = Number(parts[0]);
    if (wanted.has(id)) map.set(id, parts[2]);
  }
  return map;
}

export async function importTatoeba() {
  process.stdout.write("  Verknüpfungen lesen …\n");
  const [toGerman, toEnglish] = await Promise.all([
    readLinks("jpn-deu_links.tsv.bz2"),
    readLinks("jpn-eng_links.tsv.bz2"),
  ]);

  process.stdout.write("  Übersetzungen lesen …\n");
  const [german, english] = await Promise.all([
    readSentences("deu_sentences.tsv.bz2", new Set(toGerman.values())),
    readSentences("eng_sentences.tsv.bz2", new Set(toEnglish.values())),
  ]);

  const bar = progress("Sätze");
  let batch: {
    sourceId: number;
    japanese: string;
    translations: { de?: string; en?: string };
    charCount: number;
    kanjiCount: number;
  }[] = [];
  let withGerman = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await db.sentence.createMany({ data: batch, skipDuplicates: true });
    bar.tick(batch.length);
    batch = [];
  };

  for await (const line of lines("jpn_sentences.tsv.bz2")) {
    const parts = line.split("\t");
    if (parts.length < 3) continue;

    const sourceId = Number(parts[0]);
    const japanese = parts[2];

    const de = german.get(toGerman.get(sourceId) ?? -1);
    const en = english.get(toEnglish.get(sourceId) ?? -1);
    if (!de && !en) continue;
    if (de) withGerman += 1;

    batch.push({
      sourceId,
      japanese,
      translations: { ...(de ? { de } : {}), ...(en ? { en } : {}) },
      charCount: [...japanese].length,
      kanjiCount: (japanese.match(KANJI) ?? []).length,
    });

    if (batch.length >= 2000) await flush();
  }
  await flush();

  const total = bar.done();
  console.log(
    `    davon mit deutscher Übersetzung: ${withGerman.toLocaleString("de-DE")}`,
  );
  return total;
}
