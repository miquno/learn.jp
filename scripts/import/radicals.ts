/**
 * KanjiVG → Radical + KanjiRadical
 *
 * KanjiVG nests components: 語 contains 言 and 吾, and 吾 in turn contains 五
 * and 口. Only the *direct* children are taken. The full recursive expansion
 * would make 二 a component of 語, which is true of the drawing and useless to
 * a learner.
 *
 * One group per character carries `kvg:radical`, marking the classical
 * (Kangxi) radical — that one is flagged so kanji search by radical can use it
 * later.
 *
 * Stroke counts come from counting `<path>` elements, which is exact. Meanings
 * are borrowed from KANJIDIC2 where the component is itself a kanji; parts
 * that only ever appear inside other characters (such as 亠) keep an empty
 * meaning until someone writes one.
 */
import { db } from "./lib/db";
import { openGzip, progress, streamElements } from "./lib/source";

type Parsed = {
  character: string;
  strokes: number;
  /** Direct components, in drawing order. */
  components: string[];
  classicalRadical: string | null;
};

function characterFrom(xml: string): string | null {
  const id = /<kanji id="kvg:kanji_([0-9a-f]+)"/.exec(xml)?.[1];
  if (!id) return null;
  const code = Number.parseInt(id, 16);
  return Number.isFinite(code) ? String.fromCodePoint(code) : null;
}

/**
 * Walks the group nesting to find the children one level below the root.
 * A regex alone cannot do this — `kvg:element` appears at every depth.
 */
function parse(xml: string): Parsed | null {
  const character = characterFrom(xml);
  if (!character) return null;

  const components: string[] = [];
  let classicalRadical: string | null = null;
  let strokes = 0;
  let depth = 0;

  const tag = /<(\/?)(g|path)\b([^>]*)>/g;
  let match: RegExpExecArray | null;

  while ((match = tag.exec(xml))) {
    const [, closing, name, attributes] = match;

    if (name === "path") {
      if (!closing) strokes += 1;
      continue;
    }

    if (closing) {
      depth -= 1;
      continue;
    }

    depth += 1;
    // depth 1 is the character itself, depth 2 its direct components.
    if (depth === 2) {
      const element = /kvg:element="([^"]*)"/.exec(attributes)?.[1];
      if (element) {
        components.push(element);
        if (/kvg:radical="/.test(attributes)) classicalRadical = element;
      }
    }
  }

  return { character, strokes, components, classicalRadical };
}

export async function importRadicals() {
  const bar = progress("Kanji scanned");

  const parsed: Parsed[] = [];
  const strokesByCharacter = new Map<string, number>();

  for await (const xml of streamElements(openGzip("kanjivg.xml.gz"), "kanji")) {
    const entry = parse(xml);
    if (!entry || entry.components.length === 0) continue;
    parsed.push(entry);
    strokesByCharacter.set(entry.character, entry.strokes);
    bar.tick();
  }
  bar.done();

  // Only characters the app actually knows get links; KanjiVG also covers
  // digits, punctuation and kana.
  const knownKanji = new Map(
    (
      await db.kanji.findMany({ select: { id: true, character: true, meanings: true, strokeCount: true } })
    ).map((k) => [k.character, k]),
  );

  const componentCharacters = new Set(
    parsed.flatMap((entry) => entry.components),
  );

  const radicalBar = progress("Radicals");
  const radicalRows = [...componentCharacters].map((character) => {
    const asKanji = knownKanji.get(character);
    return {
      character,
      // Borrowed from KANJIDIC2 where the part is also a standalone kanji.
      meanings: asKanji?.meanings ?? { de: [], en: [] },
      strokeCount: asKanji?.strokeCount ?? strokesByCharacter.get(character) ?? 0,
    };
  });

  await db.radical.createMany({ data: radicalRows, skipDuplicates: true });
  radicalBar.tick(radicalRows.length);
  radicalBar.done();

  const radicalIds = new Map(
    (await db.radical.findMany({ select: { id: true, character: true } })).map(
      (r) => [r.character, r.id],
    ),
  );

  const linkBar = progress("Links");
  let links: { kanjiId: string; radicalId: string }[] = [];

  const flush = async () => {
    if (links.length === 0) return;
    await db.kanjiRadical.createMany({ data: links, skipDuplicates: true });
    linkBar.tick(links.length);
    links = [];
  };

  for (const entry of parsed) {
    const kanji = knownKanji.get(entry.character);
    if (!kanji) continue;

    for (const component of new Set(entry.components)) {
      const radicalId = radicalIds.get(component);
      if (radicalId) links.push({ kanjiId: kanji.id, radicalId });
    }
    if (links.length >= 2000) await flush();
  }
  await flush();
  linkBar.done();

  const withMeaning = radicalRows.filter(
    (r) => (r.meanings as { en?: string[] }).en?.length,
  ).length;
  console.log(
    `    of which with a borrowed meaning: ${withMeaning.toLocaleString("en-GB")}`,
  );
}
