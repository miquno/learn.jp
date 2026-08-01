/**
 * Importer runner.
 *
 *   npm run import            — every step in order
 *   npm run import kanji      — individual steps only
 *
 * All steps are idempotent: running them again adds nothing twice. The raw
 * data lives in data/raw and comes from scripts/import/download.sh.
 */
import { db } from "./lib/db";
import { assignJlptLevels } from "./jlpt";
import { importJmdict } from "./jmdict";
import { importKana } from "./kana";
import { importKanjidic } from "./kanjidic";
import { importKanjiVg } from "./kanjivg";
import { linkSentences } from "./link-sentences";
import { importRadicals } from "./radicals";
import { importShop } from "./shop";
import { importTatoeba } from "./tatoeba";

const STEPS = {
  kana: { label: "Kana", run: importKana },
  words: { label: "Words (JMdict)", run: importJmdict },
  kanji: { label: "Kanji (KANJIDIC2)", run: importKanjidic },
  strokes: { label: "Stroke order (KanjiVG)", run: importKanjiVg },
  // Needs the kanji: meanings and stroke counts are borrowed from them.
  radicals: { label: "Radicals (KanjiVG)", run: importRadicals },
  sentences: { label: "Example sentences (Tatoeba)", run: importTatoeba },
  // Needs both words and sentences in place.
  links: { label: "Word ↔ sentence links", run: linkSentences },
  // Must run after kanji and words: the word level depends on the characters.
  jlpt: { label: "JLPT levels", run: assignJlptLevels },
  shop: { label: "Avatar items", run: importShop },
} as const;

type StepName = keyof typeof STEPS;

async function main() {
  const requested = process.argv.slice(2) as StepName[];
  const unknown = requested.filter((name) => !(name in STEPS));
  if (unknown.length > 0) {
    console.error(`Unknown steps: ${unknown.join(", ")}`);
    console.error(`Available: ${Object.keys(STEPS).join(", ")}`);
    process.exit(1);
  }

  // Stroke order requires the kanji — the order in STEPS is the correct one
  // and is kept even when only a subset is selected.
  const steps = (Object.keys(STEPS) as StepName[]).filter(
    (name) => requested.length === 0 || requested.includes(name),
  );

  const startedAt = Date.now();
  for (const name of steps) {
    const { label, run } = STEPS[name];
    console.log(`\n${label}`);
    await run();
  }

  const seconds = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\nDone in ${Math.floor(seconds / 60)}m ${seconds % 60}s.`);
}

main()
  .catch((error) => {
    console.error("\nImport aborted:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
