"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { defaultLocale, isLocale } from "@/i18n/config";
import { buyItem, equipItem, setAppearance } from "@/lib/avatar/loadout";
import { auth } from "@/lib/auth";

const appearanceSchema = z.object({
  base: z.enum(["feminine", "masculine"]).optional(),
  // Nur Hex-Farben — die Werte landen unverändert in einem SVG-Attribut.
  skinTone: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  hairColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});

async function requireUserId() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("Nicht angemeldet");
  return id;
}

function refresh(lang: string) {
  const locale = isLocale(lang) ? lang : defaultLocale;
  revalidatePath(`/${locale}/avatar`);
  revalidatePath(`/${locale}/dashboard`);
}

export async function purchase(itemId: string, lang: string) {
  const userId = await requireUserId();
  const result = await buyItem(userId, itemId);
  if (result.ok) {
    // Direkt anlegen: wer etwas kauft, will es sehen — ein zweiter Klick
    // dafür wäre reine Schikane.
    await equipItem(userId, itemId);
  }
  refresh(lang);
  return result;
}

export async function equip(itemId: string, lang: string) {
  const userId = await requireUserId();
  await equipItem(userId, itemId);
  refresh(lang);
}

export async function updateAppearance(
  data: z.input<typeof appearanceSchema>,
  lang: string,
) {
  const userId = await requireUserId();
  const parsed = appearanceSchema.safeParse(data);
  if (!parsed.success) return;
  await setAppearance(userId, parsed.data);
  refresh(lang);
}
