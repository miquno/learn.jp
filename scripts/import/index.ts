/**
 * Importer-Läufer.
 *
 *   npm run import            — alle Schritte in Reihenfolge
 *   npm run import kanji      — nur einzelne Schritte
 *
 * Alle Schritte sind idempotent: mehrfaches Ausführen fügt nichts doppelt
 * hinzu. Die Rohdaten liegen in data/raw und kommen aus scripts/import/download.sh.
 */
import { db } from "./lib/db";
import { assignJlptLevels } from "./jlpt";
import { importJmdict } from "./jmdict";
import { importKana } from "./kana";
import { importKanjidic } from "./kanjidic";
import { importKanjiVg } from "./kanjivg";
import { importTatoeba } from "./tatoeba";

const STEPS = {
  kana: { label: "Kana", run: importKana },
  words: { label: "Wörter (JMdict)", run: importJmdict },
  kanji: { label: "Kanji (KANJIDIC2)", run: importKanjidic },
  strokes: { label: "Strichfolgen (KanjiVG)", run: importKanjiVg },
  sentences: { label: "Beispielsätze (Tatoeba)", run: importTatoeba },
  // Muss nach Kanji und Wörtern laufen: die Wortstufe hängt an den Zeichen.
  jlpt: { label: "JLPT-Stufen", run: assignJlptLevels },
} as const;

type StepName = keyof typeof STEPS;

async function main() {
  const requested = process.argv.slice(2) as StepName[];
  const unknown = requested.filter((name) => !(name in STEPS));
  if (unknown.length > 0) {
    console.error(`Unbekannte Schritte: ${unknown.join(", ")}`);
    console.error(`Verfügbar: ${Object.keys(STEPS).join(", ")}`);
    process.exit(1);
  }

  // Strichfolgen setzen die Kanji voraus — die Reihenfolge in STEPS ist die
  // fachlich richtige und wird auch bei Teilauswahl beibehalten.
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
  console.log(`\nFertig in ${Math.floor(seconds / 60)}m ${seconds % 60}s.`);
}

main()
  .catch((error) => {
    console.error("\nImport abgebrochen:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
