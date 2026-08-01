/**
 * Links kanji to the words they appear in.
 *
 * Far cheaper than linking sentences: a word's written form *is* the list of
 * characters it uses, so there is no matching problem and no ambiguity — 「時間」
 * contains 時 and 間, full stop.
 *
 * Feeds "words using this character" in the kanji browser, and the reverse
 * direction ("which kanji do I need for this word") in vocabulary lessons.
 *
 * Words are capped per kanji: 日 appears in thousands of words, and a browser
 * page showing all of them is a wall rather than a list. The most frequent
 * ones are kept, which are also the ones worth learning first.
 */
import { db } from "./lib/db";
import { progress } from "./lib/source";

/** How many example words to keep per kanji. */
const MAX_PER_KANJI = 20;

export async function linkKanjiWords() {
  const loading = progress("Loading");

  const kanjiIds = new Map(
    (await db.kanji.findMany({ select: { id: true, character: true } })).map(
      (kanji) => [kanji.character, kanji.id],
    ),
  );
  loading.tick(kanjiIds.size);

  // Frequency order, so the cap keeps the most useful words.
  const words = await db.word.findMany({
    where: { written: { not: null } },
    select: { id: true, written: true },
    orderBy: [{ frequency: "asc" }, { id: "asc" }],
  });
  loading.tick(words.length);
  loading.done();

  const bar = progress("Links");
  const countPerKanji = new Map<string, number>();
  let batch: { kanjiId: string; wordId: string }[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await db.kanjiWord.createMany({ data: batch, skipDuplicates: true });
    bar.tick(batch.length);
    batch = [];
  };

  for (const word of words) {
    // A character repeated in one word (日々) should still link only once.
    for (const character of new Set(word.written ?? "")) {
      const kanjiId = kanjiIds.get(character);
      if (!kanjiId) continue;

      const used = countPerKanji.get(kanjiId) ?? 0;
      if (used >= MAX_PER_KANJI) continue;

      countPerKanji.set(kanjiId, used + 1);
      batch.push({ kanjiId, wordId: word.id });
    }
    if (batch.length >= 5000) await flush();
  }
  await flush();
  bar.done();

  console.log(
    `    kanji with at least one word: ${countPerKanji.size.toLocaleString("en-GB")} of ${kanjiIds.size.toLocaleString("en-GB")}`,
  );
}
