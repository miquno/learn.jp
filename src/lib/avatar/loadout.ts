import "server-only";

import type { AvatarSlot } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import type { AvatarView } from "@/components/avatar/avatar";

/** Zeichenreihenfolge der Ebenen, von hinten nach vorn. */
const LAYER_ORDER: AvatarSlot[] = [
  "background",
  "hair_back",
  "body",
  "bottom",
  "top",
  "shoes",
  "hair",
  "accessory",
];

type Equipped = Partial<Record<AvatarSlot, string>>;

/**
 * Legt Ausstattung und Startgarderobe an, falls noch keine da ist.
 *
 * Die kostenlosen Artikel gehören von Anfang an ins Inventar — eine nackte
 * Figur als erster Eindruck wäre ein schlechter Einstieg, und mit "0 Münzen,
 * kauf dir was" fängt niemand gern an.
 */
export async function ensureLoadout(userId: string) {
  const existing = await db.avatarLoadout.findUnique({ where: { userId } });
  if (existing) return existing;

  const starters = await db.shopItem.findMany({ where: { price: 0 } });

  await db.inventoryItem.createMany({
    data: starters.map((item) => ({ userId, itemId: item.id })),
    skipDuplicates: true,
  });

  const equipped: Equipped = {};
  for (const item of starters) equipped[item.slot] = item.id;

  return db.avatarLoadout.create({
    data: { userId, equipped },
  });
}

/** Ausstattung in die Form, die die Zeichenkomponente erwartet. */
export async function getAvatarView(userId: string): Promise<AvatarView> {
  const loadout = await ensureLoadout(userId);
  const equipped = (loadout.equipped ?? {}) as Equipped;

  const ids = Object.values(equipped).filter(Boolean);
  const items = await db.shopItem.findMany({
    where: { id: { in: ids } },
    select: { id: true, slot: true, assetKey: true },
  });
  const bySlot = new Map(items.map((item) => [item.slot, item.assetKey]));

  return {
    base: loadout.base,
    skinTone: loadout.skinTone,
    hairColor: loadout.hairColor,
    layers: LAYER_ORDER.map((slot) => bySlot.get(slot)).filter(
      (key): key is string => Boolean(key),
    ),
  };
}

/**
 * Kauf. Prüft Guthaben und Besitz und schreibt beides in einer Transaktion —
 * sonst könnten zwei schnelle Klicks denselben Artikel zweimal abbuchen.
 */
export async function buyItem(userId: string, itemId: string) {
  return db.$transaction(async (tx) => {
    const [user, item, owned] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { coins: true } }),
      tx.shopItem.findUnique({ where: { id: itemId } }),
      tx.inventoryItem.findUnique({
        where: { userId_itemId: { userId, itemId } },
      }),
    ]);

    if (!user || !item) return { ok: false as const, reason: "unknown" };
    if (owned) return { ok: false as const, reason: "owned" };
    if (user.coins < item.price) return { ok: false as const, reason: "funds" };

    await tx.inventoryItem.create({ data: { userId, itemId } });
    await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: item.price } },
    });
    await tx.coinTransaction.create({
      data: { userId, delta: -item.price, reason: "purchase", refId: itemId },
    });

    return { ok: true as const };
  });
}

/** Ein Teil anlegen — nur, was auch im Inventar liegt. */
export async function equipItem(userId: string, itemId: string) {
  const [owned, loadout] = await Promise.all([
    db.inventoryItem.findUnique({
      where: { userId_itemId: { userId, itemId } },
      include: { item: { select: { slot: true } } },
    }),
    ensureLoadout(userId),
  ]);
  if (!owned) return false;

  const equipped = { ...((loadout.equipped ?? {}) as Equipped) };
  equipped[owned.item.slot] = itemId;

  await db.avatarLoadout.update({ where: { userId }, data: { equipped } });
  return true;
}

export async function setAppearance(
  userId: string,
  data: { base?: "feminine" | "masculine"; skinTone?: string; hairColor?: string },
) {
  await ensureLoadout(userId);
  await db.avatarLoadout.update({ where: { userId }, data });
}
