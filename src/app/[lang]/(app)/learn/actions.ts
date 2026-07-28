"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { defaultLocale, isLocale } from "@/i18n/config";
import { auth } from "@/lib/auth";
import { applyReview, startKana } from "@/lib/srs/review";

const ratingSchema = z.enum(["again", "hard", "good", "easy"]);

async function requireUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Nicht angemeldet");
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

/**
 * Eine Antwort je Aufruf. Next reiht Server Actions pro Client ohnehin
 * sequenziell auf — was hier genau richtig ist, weil auch die Person eine
 * Karte nach der anderen beantwortet.
 */
export async function submitAnswer(
  cardId: string,
  rating: string,
  durationMs: number,
) {
  const userId = await requireUserId();
  const parsed = ratingSchema.safeParse(rating);
  if (!parsed.success) throw new Error("Ungültige Bewertung");

  await applyReview(userId, cardId, parsed.data, durationMs);
}
