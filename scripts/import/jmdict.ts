/**
 * JMdict → Word
 *
 * Two quirks of the format shape this code:
 *
 * 1. German meanings live in their *own* <sense> blocks marked
 *    xml:lang="ger". English glosses carry no language attribute at all, so
 *    the senses cannot simply be read in parallel.
 * 2. Parts of speech (<pos>) appear only on the English senses, and as DTD
 *    entities (&n;, &v5r; …). The entity is the code itself — handier than
 *    the resolved plain text.
 *
 * Of 218,173 entries, 30,148 carry a frequency marker; 29,052 of those also
 * have German meanings. Exactly that core is imported — the rest is technical
 * vocabulary and name material nobody learns early on.
 */
import type { WordClass } from "../../src/generated/prisma/enums";

import { db } from "./lib/db";
import { toRomaji } from "./lib/romaji";
import { all, decodeEntities, first, openGzip, progress, streamElements } from "./lib/source";

/** Only entries with a frequency marker — see the header comment. */
const REQUIRE_FREQUENCY = true;

type Parsed = {
  sourceId: number;
  written: string | null;
  reading: string;
  romaji: string;
  meanings: { de: string[]; en: string[] };
  partOfSpeech: string[];
  wordClass: WordClass;
  frequency: number | null;
  isCommon: boolean;
};

/** Sense blocks with their language code. No attribute means English. */
function senses(xml: string): { lang: string; body: string }[] {
  const out: { lang: string; body: string }[] = [];
  const re = /<sense>([\s\S]*?)<\/sense>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const body = m[1];
    const lang = /xml:lang="(\w+)"/.exec(body)?.[1] ?? "eng";
    out.push({ lang, body });
  }
  return out;
}

/**
 * Frequency from the priority codes. `nfXX` is the finest signal: XX is the
 * number of a 500-word block in the frequency list, so nf01 is the 500 most
 * common words. Without an nf code the coarse markers are approximated.
 */
function frequencyFrom(codes: string[]): number | null {
  const nf = codes.map((c) => /^nf(\d+)$/.exec(c)?.[1]).find(Boolean);
  if (nf) return Number(nf) * 500;
  if (codes.includes("ichi1") || codes.includes("news1")) return 6000;
  if (codes.includes("spec1")) return 8000;
  if (codes.includes("ichi2") || codes.includes("news2")) return 12000;
  if (codes.includes("spec2") || codes.includes("gai1")) return 16000;
  return codes.length > 0 ? 24000 : null;
}

/** Conjugation class from the part-of-speech codes. */
function wordClassFrom(pos: string[]): WordClass {
  if (pos.some((p) => p.startsWith("v5"))) return "godan";
  if (pos.some((p) => p === "v1" || p === "v1-s")) return "ichidan";
  if (pos.some((p) => p.startsWith("vs-i") || p === "vk" || p === "vs")) {
    return "irregular";
  }
  if (pos.includes("adj-i")) return "i_adjective";
  if (pos.includes("adj-na")) return "na_adjective";
  return "other";
}

function parseEntry(xml: string): Parsed | null {
  const sourceId = Number(first(xml, "ent_seq"));
  if (!Number.isFinite(sourceId)) return null;

  const reading = first(xml, "reb");
  if (!reading) return null;

  const priorities = [...all(xml, "ke_pri"), ...all(xml, "re_pri")];
  const frequency = frequencyFrom(priorities);
  if (REQUIRE_FREQUENCY && frequency === null) return null;

  const blocks = senses(xml);

  const glossesOf = (lang: string) =>
    blocks
      .filter((s) => s.lang === lang)
      .flatMap((s) => all(s.body, "gloss"))
      .map((g) => g.trim())
      .filter(Boolean);

  const en = glossesOf("eng");
  const de = glossesOf("ger");
  if (en.length === 0 && de.length === 0) return null;

  // Known weakness: the German sense blocks are not in the same order as the
  // English ones and carry no part-of-speech data. For 生きる the first German
  // gloss is therefore a film title instead of "to live". This can only be
  // fixed properly by a curation pass over the most common vocabulary — until
  // then the English meaning is the more reliable one.

  // <pos>&n;</pos> — the entity itself is the part-of-speech code.
  const partOfSpeech = [
    ...new Set(
      blocks
        .filter((s) => s.lang === "eng")
        .flatMap((s) => all(s.body, "pos"))
        .map((p) => decodeEntities(p).replace(/^&|;$/g, "")),
    ),
  ];

  return {
    sourceId,
    written: first(xml, "keb") ?? null,
    reading,
    romaji: toRomaji(reading),
    meanings: { de, en },
    partOfSpeech,
    wordClass: wordClassFrom(partOfSpeech),
    frequency,
    isCommon: priorities.some((c) =>
      ["ichi1", "news1", "spec1"].includes(c),
    ),
  };
}

export async function importJmdict() {
  const bar = progress("Words");
  let batch: Parsed[] = [];
  let skipped = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    // createMany + skipDuplicates rather than individual upserts: across
    // 30,000 records that is the difference between minutes and seconds.
    await db.word.createMany({ data: batch, skipDuplicates: true });
    bar.tick(batch.length);
    batch = [];
  };

  for await (const xml of streamElements(openGzip("JMdict.gz"), "entry")) {
    const parsed = parseEntry(xml);
    if (!parsed) {
      skipped += 1;
      continue;
    }
    batch.push(parsed);
    if (batch.length >= 1000) await flush();
  }
  await flush();

  const total = bar.done();
  const withGerman = await db.word.count({
    where: { NOT: { meanings: { path: ["de"], equals: [] } } },
  });
  console.log(
    `    with a German meaning: ${withGerman.toLocaleString("en-GB")}`,
  );
  console.log(
    `    skipped (no frequency or meaning): ${skipped.toLocaleString("en-GB")}`,
  );
  return total;
}
