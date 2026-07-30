import { notFound } from "next/navigation";

import {
  AvatarStudio,
  type StudioItem,
} from "@/components/avatar/avatar-studio";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getAvatarView } from "@/lib/avatar/loadout";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";

type Localised = { de: string; en: string };

export default async function AvatarPage({
  params,
}: PageProps<"/[lang]/avatar">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const [dict, user] = await Promise.all([
    getDictionary(lang),
    requireUser(lang),
  ]);

  const [view, items, inventory] = await Promise.all([
    getAvatarView(user.id),
    db.shopItem.findMany({ orderBy: [{ slot: "asc" }, { order: "asc" }] }),
    db.inventoryItem.findMany({
      where: { userId: user.id },
      select: { itemId: true },
    }),
  ]);

  const ownedIds = new Set(inventory.map((entry) => entry.itemId));
  const equippedKeys = new Set(view.layers);

  const studioItems: StudioItem[] = items.map((item) => {
    const name = item.name as unknown as Localised;
    const description = item.description as unknown as Localised;

    return {
      id: item.id,
      name: name[lang],
      description: description[lang],
      slot: item.slot as StudioItem["slot"],
      rarity: item.rarity as StudioItem["rarity"],
      price: item.price,
      owned: ownedIds.has(item.id),
      equipped: equippedKeys.has(item.assetKey),
      // Preview on your own character: the item replaces the current layer of
      // the same slot, everything else stays put.
      preview: {
        ...view,
        layers: [
          ...view.layers.filter((key) => {
            const other = items.find((candidate) => candidate.assetKey === key);
            return other?.slot !== item.slot;
          }),
          item.assetKey,
        ],
      },
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-content-strong">
          {dict.avatar.title}
        </h1>
        <p className="mt-1 text-content-muted">{dict.avatar.intro}</p>
      </div>

      <AvatarStudio
        view={view}
        items={studioItems}
        coins={user.coins}
        dict={dict}
        locale={lang}
      />
    </div>
  );
}
