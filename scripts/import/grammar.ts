/**
 * Generates JLPT grammar points with the Anthropic API.
 *
 *   npm run grammar N5
 *
 * Grammar is the one blocker that code alone cannot solve: there is no openly
 * licensed dataset for it. So a first draft is generated here and then edited
 * by hand — every row lands with `reviewed: false` and stays hidden from
 * learners until a human flips that flag.
 *
 * ## Why the pattern list is fixed, not model-invented
 *
 * The *set* of N5 grammar points is well established (それ is what every
 * textbook and the pre-2010 JLPT syllabus agree on); only the explanations
 * and examples need writing. Asking the model to also decide *which* points
 * exist would make the output non-reproducible and risk both gaps and
 * invented patterns. So the slugs and titles are pinned below and the model
 * fills in teaching text and examples for each — one API call per point,
 * which keeps each response small and lets a failure retry just that point.
 *
 * ## Reproducibility and cost
 *
 * Idempotent on the slug: a point already in the database is skipped, so a
 * re-run only fills gaps. That matters because each point is a paid API call —
 * re-generating all of N5 on every run would be wasteful and would also
 * overwrite hand-edits.
 */
import "dotenv/config";

import Anthropic from "@anthropic-ai/sdk";

import type { JlptLevel } from "../../src/generated/prisma/enums";

import { db } from "./lib/db";
import { progress } from "./lib/source";

/**
 * The N5 grammar syllabus. Order is the teaching sequence — copula and
 * particles before て-form before conditionals — which frequency data can't
 * supply. Titles use 〜 for the attachment point, the convention every
 * textbook uses.
 */
const N5: { slug: string; title: string; structure: string }[] = [
  { slug: "n5-desu", title: "〜です", structure: "noun + です" },
  { slug: "n5-wa-particle", title: "〜は", structure: "topic + は" },
  { slug: "n5-mo", title: "〜も", structure: "noun + も" },
  { slug: "n5-no-possessive", title: "〜の", structure: "noun + の + noun" },
  { slug: "n5-ka-question", title: "〜か", structure: "sentence + か" },
  { slug: "n5-o-object", title: "〜を", structure: "object + を + verb" },
  { slug: "n5-ni-location", title: "〜に (existence)", structure: "place + に + あります/います" },
  { slug: "n5-de-place", title: "〜で (place of action)", structure: "place + で + verb" },
  { slug: "n5-e-direction", title: "〜へ／に (direction)", structure: "place + へ/に + motion verb" },
  { slug: "n5-to-and", title: "〜と (and / with)", structure: "noun + と + noun" },
  { slug: "n5-masu", title: "〜ます", structure: "verb stem + ます" },
  { slug: "n5-masen", title: "〜ません", structure: "verb stem + ません" },
  { slug: "n5-mashita", title: "〜ました", structure: "verb stem + ました" },
  { slug: "n5-te-form", title: "〜てください", structure: "verb て-form + ください" },
  { slug: "n5-te-iru", title: "〜ています", structure: "verb て-form + います" },
  { slug: "n5-i-adjective", title: "い-adjectives", structure: "い-adjective + noun" },
  { slug: "n5-na-adjective", title: "な-adjectives", structure: "な-adjective + な + noun" },
  { slug: "n5-adjective-past", title: "〜かったです", structure: "い-adjective (past) + です" },
  { slug: "n5-tai", title: "〜たいです", structure: "verb stem + たいです" },
  { slug: "n5-tara-dame", title: "〜てもいいです", structure: "verb て-form + もいいです" },
  { slug: "n5-naide", title: "〜ないでください", structure: "verb ない-form + でください" },
  { slug: "n5-kara-because", title: "〜から (because)", structure: "reason + から" },
  { slug: "n5-ga-but", title: "〜が (but)", structure: "clause + が + clause" },
  { slug: "n5-mae-ni", title: "〜まえに", structure: "verb (dictionary) + まえに" },
  { slug: "n5-atode", title: "〜あとで", structure: "verb た-form + あとで" },
];

const SYLLABUS: Record<JlptLevel, typeof N5> = {
  N5,
  N4: [],
  N3: [],
  N2: [],
  N1: [],
};

/** The shape we ask the model to return — validated by the API against this. */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    meaning_en: { type: "string", description: "One-line gloss of what the pattern expresses, in English." },
    meaning_de: { type: "string", description: "The same gloss in German." },
    explanation_en: { type: "string", description: "2-4 sentences of teaching text in Markdown, English. Explain when and how to use it." },
    explanation_de: { type: "string", description: "The same explanation in German." },
    examples: {
      type: "array",
      description: "Exactly 3 example sentences using the pattern, easy enough for a beginner.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          japanese: { type: "string", description: "The Japanese sentence, using kana and only N5 kanji." },
          en: { type: "string", description: "Natural English translation." },
          de: { type: "string", description: "Natural German translation." },
        },
        required: ["japanese", "en", "de"],
      },
    },
  },
  required: ["meaning_en", "meaning_de", "explanation_en", "explanation_de", "examples"],
} as const;

type Generated = {
  meaning_en: string;
  meaning_de: string;
  explanation_en: string;
  explanation_de: string;
  examples: { japanese: string; en: string; de: string }[];
};

async function generateOne(
  client: Anthropic,
  point: { title: string; structure: string },
  level: JlptLevel,
): Promise<Generated> {
  const message = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    // Adaptive thinking: getting example sentences that are both correct and
    // restricted to beginner vocabulary is exactly the kind of task that
    // benefits from the model checking its own work.
    thinking: { type: "adaptive" },
    system:
      "You are a Japanese-language teacher writing material for a JLPT " +
      `${level} course. Explanations are for absolute beginners: clear, short, ` +
      "and free of grammar jargon the learner hasn't met yet. Example sentences " +
      "must be genuinely usable and stay within the vocabulary and kanji a " +
      `${level} learner knows. The German must read as natural German, not a ` +
      "word-for-word rendering of the English.",
    messages: [
      {
        role: "user",
        content: `Write the teaching entry for the grammar pattern 「${point.title}」 (formation: ${point.structure}).`,
      },
    ],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });

  // With output_config.format the model returns a single JSON text block.
  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("No text block in response");
  }
  return JSON.parse(text.text) as Generated;
}

export async function generateGrammar(level: JlptLevel = "N5") {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Grammar generation calls the paid " +
        "Anthropic API — put a key in .env (or run `ant auth login`) and retry.",
    );
  }

  const syllabus = SYLLABUS[level];
  if (syllabus.length === 0) {
    throw new Error(`No syllabus defined for ${level} yet — only N5 exists.`);
  }

  const client = new Anthropic({ apiKey });
  const bar = progress(`Grammar ${level}`);
  let generated = 0;
  let skipped = 0;

  for (const [index, point] of syllabus.entries()) {
    const existing = await db.grammarPoint.findUnique({
      where: { slug: point.slug },
    });
    // Idempotent: never overwrite an existing point — it may carry hand-edits.
    if (existing) {
      skipped += 1;
      bar.tick();
      continue;
    }

    const draft = await generateOne(client, point, level);

    await db.grammarPoint.create({
      data: {
        slug: point.slug,
        title: point.title,
        structure: point.structure,
        meaning: { de: draft.meaning_de, en: draft.meaning_en },
        explanation: { de: draft.explanation_de, en: draft.explanation_en },
        examples: draft.examples.map((ex) => ({
          japanese: ex.japanese,
          translations: { de: ex.de, en: ex.en },
        })),
        jlptLevel: level,
        order: index,
        reviewed: false,
      },
    });
    generated += 1;
    bar.tick();
  }

  bar.done();
  console.log(
    `    generated: ${generated}, skipped (already present): ${skipped}`,
  );
  console.log(
    `    all rows are reviewed:false — check them before they reach learners`,
  );
}

// Allow `npm run grammar N5` as a standalone entry point.
if (import.meta.url === `file://${process.argv[1]}`) {
  const level = (process.argv[2] as JlptLevel) ?? "N5";
  generateGrammar(level)
    .catch((error) => {
      console.error("\nGrammar generation failed:", error.message);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
