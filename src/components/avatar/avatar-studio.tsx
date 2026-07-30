"use client";

import { useTransition } from "react";

import {
  equip,
  purchase,
  updateAppearance,
} from "@/app/[lang]/(app)/avatar/actions";
import { Avatar, type AvatarView } from "@/components/avatar/avatar";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/get-dictionary";
import { HAIR_COLORS, SKIN_TONES } from "@/lib/avatar/palette";

export type StudioItem = {
  id: string;
  name: string;
  description: string;
  slot: keyof Dictionary["avatar"]["slot"];
  rarity: keyof Dictionary["avatar"]["rarity"];
  price: number;
  owned: boolean;
  equipped: boolean;
  preview: AvatarView;
};

type Props = {
  view: AvatarView;
  items: StudioItem[];
  coins: number;
  dict: Dictionary;
  locale: Locale;
};

const RARITY_COLOR: Record<StudioItem["rarity"], string> = {
  common: "text-rarity-common",
  uncommon: "text-rarity-uncommon",
  rare: "text-rarity-rare",
  epic: "text-rarity-epic",
  legendary: "text-rarity-legendary",
};

export function AvatarStudio({ view, items, coins, dict, locale }: Props) {
  const [pending, startTransition] = useTransition();

  const owned = items.filter((item) => item.owned);
  const forSale = items.filter((item) => !item.owned);

  function card(item: StudioItem) {
    const affordable = coins >= item.price;
    return (
      <li
        key={item.id}
        className="flex flex-col gap-2 rounded-card border border-surface-border bg-surface-raised p-3"
      >
        <div className="flex justify-center rounded-lg bg-surface-base py-2">
          {/* Preview on your own character rather than an abstract icon —
              only that shows whether an item goes with the rest. */}
          <Avatar view={item.preview} size={72} />
        </div>

        <div>
          <p className="text-sm font-medium text-content-strong">{item.name}</p>
          <p className={`text-xs ${RARITY_COLOR[item.rarity]}`}>
            {dict.avatar.rarity[item.rarity]} · {dict.avatar.slot[item.slot]}
          </p>
        </div>

        <p className="text-xs text-content-faint">{item.description}</p>

        {item.owned ? (
          <button
            type="button"
            disabled={item.equipped || pending}
            onClick={() => startTransition(() => equip(item.id, locale))}
            className="mt-auto rounded-lg border border-surface-border py-2 text-sm text-content-base hover:border-content-faint disabled:opacity-50"
          >
            {item.equipped ? dict.avatar.equipped : dict.avatar.equip}
          </button>
        ) : (
          <button
            type="button"
            disabled={!affordable || pending}
            onClick={() =>
              startTransition(async () => {
                // Return value deliberately discarded: the button is already
                // disabled when the balance is too low, and the page reloads
                // after the purchase anyway.
                await purchase(item.id, locale);
              })
            }
            className="mt-auto rounded-lg bg-accent py-2 text-sm font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-40"
          >
            {affordable
              ? `${dict.avatar.buy} · ${item.price} ◎`
              : dict.avatar.tooExpensive}
          </button>
        )}
      </li>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="flex flex-col gap-5">
        <div className="flex justify-center rounded-card border border-surface-border bg-surface-raised p-4">
          <Avatar view={view} size={200} />
        </div>

        <section className="flex flex-col gap-4 rounded-card border border-surface-border bg-surface-raised p-4">
          <h2 className="text-sm font-medium text-content-muted">
            {dict.avatar.appearance}
          </h2>

          <div>
            <p className="mb-1.5 text-xs text-content-faint">
              {dict.avatar.base}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["feminine", "masculine"] as const).map((base) => (
                <button
                  key={base}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => updateAppearance({ base }, locale))
                  }
                  className={`rounded-lg border py-2 text-sm ${
                    view.base === base
                      ? "border-accent text-content-strong"
                      : "border-surface-border text-content-muted hover:border-content-faint"
                  }`}
                >
                  {dict.avatar[base]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-content-faint">
              {dict.avatar.skin}
            </p>
            <div className="flex flex-wrap gap-2">
              {SKIN_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  aria-label={tone}
                  disabled={pending}
                  onClick={() =>
                    startTransition(() =>
                      updateAppearance({ skinTone: tone }, locale),
                    )
                  }
                  style={{ backgroundColor: tone }}
                  className={`size-7 rounded-full border-2 ${
                    view.skinTone === tone
                      ? "border-accent"
                      : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs text-content-faint">
              {dict.avatar.hair}
            </p>
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  aria-label={colour}
                  disabled={pending}
                  onClick={() =>
                    startTransition(() =>
                      updateAppearance({ hairColor: colour }, locale),
                    )
                  }
                  style={{ backgroundColor: colour }}
                  className={`size-7 rounded-full border-2 ${
                    view.hairColor === colour
                      ? "border-accent"
                      : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      </aside>

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 font-medium text-content-strong">
            {dict.avatar.wardrobe}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {owned.map(card)}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-medium text-content-strong">
              {dict.avatar.shop}
            </h2>
            <span className="text-sm text-coin">
              {coins} {dict.avatar.coins}
            </span>
          </div>
          {forSale.length === 0 ? (
            <p className="rounded-card border border-dashed border-surface-border p-8 text-center text-sm text-content-faint">
              {dict.avatar.emptyShop}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {forSale.map(card)}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
