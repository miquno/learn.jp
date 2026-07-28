/**
 * JMdict → Word
 *
 * Zwei Eigenheiten des Formats bestimmen den Aufbau:
 *
 * 1. Deutsche Bedeutungen stehen in *eigenen* <sense>-Blöcken mit
 *    xml:lang="ger". Englische Glossen tragen gar kein Sprachattribut.
 *    Man kann also nicht einfach Sinn für Sinn zusammenlesen.
 * 2. Wortarten (<pos>) stehen nur an den englischen Sinnen und als
 *    DTD-Entität (&n;, &v5r; …). Die Entität ist der Code selbst — bequemer
 *    als der aufgelöste Klartext.
 *
 * Von 218.173 Einträgen tragen 30.148 eine Häufigkeitsmarkierung; davon
 * haben 29.052 auch deutsche Bedeutungen. Genau dieser Kern wird importiert —
 * der Rest ist Fachvokabular und Namensmaterial, das niemand am Anfang lernt.
 */
import type { WordClass } from "../../src/generated/prisma/enums";

import { db } from "./lib/db";
import { toRomaji } from "./lib/romaji";
import { all, decodeEntities, first, openGzip, progress, streamElements } from "./lib/source";

/** Nur Einträge mit Häufigkeitsmarkierung — siehe Kopfkommentar. */
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

/** Sinn-Blöcke mit ihrem Sprachcode. Ohne Attribut bedeutet Englisch. */
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
 * Häufigkeit aus den Prioritätscodes. `nfXX` ist der feinste Wert: XX ist die
 * Nummer eines 500er-Blocks der Häufigkeitsliste, nf01 also die häufigsten
 * 500 Wörter. Ohne nf-Code werden die groben Marker angenähert.
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

/** Konjugationsklasse aus den Wortart-Codes. */
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

  // Bekannte Schwäche: die deutschen Sinn-Blöcke stehen nicht in derselben
  // Reihenfolge wie die englischen und tragen keine Wortart-Angaben. Bei
  // 生きる ist die erste deutsche Glosse deshalb ein Filmtitel statt "leben".
  // Sauber lösen lässt sich das nur mit einem Kurationsschritt über den
  // häufigsten Wortschatz — die englische Bedeutung ist bis dahin die
  // verlässlichere und wird im Zweifel mit angezeigt.

  // <pos>&n;</pos> — die Entität selbst ist der Wortart-Code.
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
  const bar = progress("Wörter");
  let batch: Parsed[] = [];
  let skipped = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    // createMany + skipDuplicates statt einzelner upserts: bei 29.000
    // Datensätzen ist der Unterschied Minuten gegen Sekunden.
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
    `    davon mit deutscher Bedeutung: ${withGerman.toLocaleString("de-DE")}`,
  );
  console.log(`    übersprungen (ohne Häufigkeit/Bedeutung): ${skipped.toLocaleString("de-DE")}`);
  return total;
}
