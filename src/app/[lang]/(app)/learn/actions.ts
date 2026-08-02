"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { defaultLocale, isLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import {
  applyReview,
  startGrammar,
  startKana,
  startWords,
} from "@/lib/srs/review";

const ratingSchema = z.enum(["again", "hard", "good", "easy"]);

async function requireUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

export async function beginKanaLesson(kanaIds: string[], lang: string) {
  const userId = await requireUserId();
  const added = await startKana(userId, kanaIds.slice(0, 50));

  const locale = isLocale(lang) ? lang : defaultLocale;
  revalidatePath(`/${locale}/learn/kana`);
  revalidatePath(`/${locale}/dashboard`);
  return added;
}

export async function beginVocabLesson(wordIds: string[], lang: string) {
  const userId = await requireUserId();
  const added = await startWords(userId, wordIds.slice(0, 50));

  const locale = isLocale(lang) ? lang : defaultLocale;
  revalidatePath(`/${locale}/learn/vocab`);
  revalidatePath(`/${locale}/dashboard`);
  return added;
}

export async function beginGrammarLesson(grammarIds: string[], lang: string) {
  const userId = await requireUserId();
  const added = await startGrammar(userId, grammarIds.slice(0, 20));

  const locale = isLocale(lang) ? lang : defaultLocale;
  revalidatePath(`/${locale}/learn/grammar`);
  revalidatePath(`/${locale}/dashboard`);
  return added;
}

/**
 * One answer per call. Next queues server actions per client sequentially
 * anyway — which is exactly right here, because the learner also answers one
 * card at a time.
 */
export async function submitAnswer(
  cardId: string,
  rating: string,
  durationMs: number,
) {
  const userId = await requireUserId();
  const parsed = ratingSchema.safeParse(rating);
  if (!parsed.success) throw new Error("Invalid rating");

  await applyReview(userId, cardId, parsed.data, durationMs);
}
