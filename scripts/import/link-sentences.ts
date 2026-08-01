/**
 * Links words to the example sentences they appear in.
 *
 * Japanese has no spaces, so finding "which of these 30,123 words occur in
 * this sentence" is a substring problem over a huge pattern set. Checking each
 * word against each sentence would be 7 billion comparisons; instead all
 * patterns go into one Aho-Corasick automaton and every sentence is scanned
 * once.
 *
 * ## The false-positive problem
 *
 * Substring matching alone is wrong: 「今日」 also occurs inside 「今日中」,
 * and 「日本」 inside 「日本語」. Without a morphological analyser we cannot
 * segment properly, so a boundary heuristic is used instead — a match is
 * rejected when the character immediately before or after it is a kanji.
 *
 * That is not perfect. It throws away some genuine occurrences (a word
 * legitimately followed by another kanji word) and lets through some wrong
 * ones. It is deliberately biased towards precision: a vocabulary card showing
 * a sentence that does not actually contain the word is worse than a card
 * showing one example fewer.
 *
 * Replacing this with a real tokeniser later means rewriting this one file.
 */
import { db } from "./lib/db";
import { progress } from "./lib/source";

/** How many examples to keep per word. */
const MAX_PER_WORD = 8;

/** Sentences longer than this are unhelpful as a first example. */
const MAX_SENTENCE_LENGTH = 40;

const KANJI = /[一-龯㐀-䶿]/;

type Node = {
  children: Map<string, Node>;
  fail: Node | null;
  /** Indices into the pattern list that end at this node. */
  outputs: number[];
};

function createNode(): Node {
  return { children: new Map(), fail: null, outputs: [] };
}

/**
 * Aho-Corasick: one pass over the text finds every pattern at once, regardless
 * of how many patterns there are.
 */
function buildAutomaton(patterns: string[]): Node {
  const root = createNode();

  for (const [index, pattern] of patterns.entries()) {
    let node = root;
    for (const char of pattern) {
      let next = node.children.get(char);
      if (!next) {
        next = createNode();
        node.children.set(char, next);
      }
      node = next;
    }
    node.outputs.push(index);
  }

  // Breadth-first pass wiring up the failure links.
  const queue: Node[] = [];
  for (const child of root.children.values()) {
    child.fail = root;
    queue.push(child);
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const [char, child] of node.children) {
      let fallback = node.fail;
      while (fallback && !fallback.children.has(char)) fallback = fallback.fail;
      child.fail = fallback?.children.get(char) ?? root;
      // Inherit outputs so a shorter pattern ending here is not missed.
      child.outputs.push(...child.fail.outputs);
      queue.push(child);
    }
  }

  return root;
}

/** Pattern indices found in `text`, after the boundary check. */
function search(root: Node, text: string, patterns: string[]): Set<number> {
  const found = new Set<number>();
  const chars = [...text];
  let node = root;

  for (let position = 0; position < chars.length; position += 1) {
    const char = chars[position];
    while (node !== root && !node.children.has(char)) node = node.fail ?? root;
    node = node.children.get(char) ?? root;

    for (const index of node.outputs) {
      const length = [...patterns[index]].length;
      const start = position - length + 1;

      // Reject when the match sits inside a longer run of kanji — the usual
      // sign that it is part of a compound rather than a word on its own.
      const before = start > 0 ? chars[start - 1] : "";
      const after = position + 1 < chars.length ? chars[position + 1] : "";
      if (KANJI.test(before) || KANJI.test(after)) continue;

      found.add(index);
    }
  }

  return found;
}

export async function linkSentences() {
  const loading = progress("Loading");

  // Only words that can plausibly be matched. Single characters match far too
  // much (人 occurs in thousands of sentences and in dozens of compounds).
  const words = (
    await db.word.findMany({
      select: { id: true, written: true, reading: true, frequency: true },
      orderBy: { frequency: "asc" },
    })
  )
    .map((word) => ({ ...word, pattern: word.written ?? word.reading }))
    .filter((word) => [...word.pattern].length >= 2);

  loading.tick(words.length);

  const sentences = await db.sentence.findMany({
    where: { charCount: { lte: MAX_SENTENCE_LENGTH } },
    select: { id: true, japanese: true, charCount: true },
    orderBy: { charCount: "asc" },
  });
  loading.tick(sentences.length);
  loading.done();

  const patterns = words.map((word) => word.pattern);
  const root = buildAutomaton(patterns);

  const bar = progress("Scanning sentences");
  // Sentences arrive shortest first, so the first hits kept for a word are
  // also the simplest examples.
  const linksByWord = new Map<number, string[]>();

  for (const sentence of sentences) {
    for (const index of search(root, sentence.japanese, patterns)) {
      const list = linksByWord.get(index);
      if (!list) linksByWord.set(index, [sentence.id]);
      else if (list.length < MAX_PER_WORD) list.push(sentence.id);
    }
    bar.tick();
  }
  bar.done();

  const writing = progress("Links");
  let batch: { wordId: string; sentenceId: string }[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    await db.wordSentence.createMany({ data: batch, skipDuplicates: true });
    writing.tick(batch.length);
    batch = [];
  };

  for (const [index, sentenceIds] of linksByWord) {
    for (const sentenceId of sentenceIds) {
      batch.push({ wordId: words[index].id, sentenceId });
    }
    if (batch.length >= 5000) await flush();
  }
  await flush();
  writing.done();

  const covered = linksByWord.size;
  console.log(
    `    words with at least one example: ${covered.toLocaleString("en-GB")} of ${words.length.toLocaleString("en-GB")} (${Math.round((covered / words.length) * 100)}%)`,
  );
}
