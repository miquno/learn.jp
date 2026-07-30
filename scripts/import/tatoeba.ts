/**
 * Tatoeba → Sentence
 *
 * Format: `id \t language \t text` for sentences, `jpn_id \t other_id` for
 * links. There are 248,821 Japanese sentences, 58,352 of them with a German
 * link and 280,610 links to English translations (several translations per
 * sentence are possible — the first one is taken).
 *
 * Only sentences with at least one translation are imported: a Japanese
 * sentence with no meaning attached is useless to a learner.
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

/** jpn id → id of the translation. First one wins. */
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

/** Texts for the ids we need — the rest is never kept at all. */
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
  process.stdout.write("  reading links …\n");
  const [toGerman, toEnglish] = await Promise.all([
    readLinks("jpn-deu_links.tsv.bz2"),
    readLinks("jpn-eng_links.tsv.bz2"),
  ]);

  process.stdout.write("  reading translations …\n");
  const [german, english] = await Promise.all([
    readSentences("deu_sentences.tsv.bz2", new Set(toGerman.values())),
    readSentences("eng_sentences.tsv.bz2", new Set(toEnglish.values())),
  ]);

  const bar = progress("Sentences");
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
    `    with a German translation: ${withGerman.toLocaleString("en-GB")}`,
  );
  return total;
}
