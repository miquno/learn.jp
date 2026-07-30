/**
 * The item catalogue. Nothing is imported from outside — the items belong to
 * the artwork in src/lib/avatar/parts.ts and are maintained alongside it.
 *
 * Pricing: common items cost roughly one day of study (about 40 coins),
 * legendary ones roughly two weeks. Visible progress should come early, but
 * there should be a distant goal too.
 */
import type { AvatarSlot, ItemRarity } from "../../src/generated/prisma/enums";

import { db } from "./lib/db";
import { progress } from "./lib/source";

type Entry = {
  slug: string;
  assetKey: string;
  slot: AvatarSlot;
  rarity: ItemRarity;
  price: number;
  de: [string, string];
  en: [string, string];
};

const CATALOGUE: Entry[] = [
  // Hair — the entry point, priced accordingly.
  {
    slug: "hair-short",
    assetKey: "hair_short",
    slot: "hair",
    rarity: "common",
    price: 0,
    de: ["Kurzhaar", "Praktisch. Übersteht auch lange Lernabende."],
    en: ["Short hair", "Practical. Survives long study nights."],
  },
  {
    slug: "hair-twin",
    assetKey: "hair_twin",
    slot: "hair",
    rarity: "uncommon",
    price: 120,
    de: ["Zwei Zöpfe", "Symmetrie ist auch eine Form von Ordnung."],
    en: ["Twin tails", "Symmetry is a kind of tidiness too."],
  },
  {
    slug: "hair-long",
    assetKey: "hair_long",
    slot: "hair",
    rarity: "rare",
    price: 240,
    de: ["Langhaar", "Braucht morgens zehn Minuten mehr. Wert ist es das."],
    en: ["Long hair", "Ten more minutes every morning. Worth it."],
  },

  // Tops
  {
    slug: "top-tee",
    assetKey: "top_tee",
    slot: "top",
    rarity: "common",
    price: 0,
    de: ["T-Shirt", "Ein Anfang. Mehr will es gar nicht sein."],
    en: ["T-shirt", "A start. It doesn't claim to be more."],
  },
  {
    slug: "top-hoodie",
    assetKey: "top_hoodie",
    slot: "top",
    rarity: "uncommon",
    price: 160,
    de: ["Kapuzenpulli", "Die Kapuze war noch nie oben. Trotzdem wichtig."],
    en: ["Hoodie", "The hood has never been up. Still essential."],
  },
  {
    slug: "top-sailor",
    assetKey: "top_sailor",
    slot: "top",
    rarity: "epic",
    price: 600,
    de: ["Matrosenbluse", "Der Klassiker. Kommt nie aus der Mode, weil er nie in ihr war."],
    en: ["Sailor blouse", "The classic. Never out of style because it was never in it."],
  },

  // Bottoms
  {
    slug: "bottom-jeans",
    assetKey: "bottom_jeans",
    slot: "bottom",
    rarity: "common",
    price: 0,
    de: ["Jeans", "Passt zu allem. Deshalb trägt sie jeder."],
    en: ["Jeans", "Goes with everything. Which is why everyone wears them."],
  },
  {
    slug: "bottom-skirt",
    assetKey: "bottom_skirt",
    slot: "bottom",
    rarity: "uncommon",
    price: 140,
    de: ["Faltenrock", "Die Falten sind gezählt. Von jemandem mit viel Zeit."],
    en: ["Pleated skirt", "The pleats are counted. By someone with time."],
  },

  // Shoes
  {
    slug: "shoes-sneakers",
    assetKey: "shoes_sneakers",
    slot: "shoes",
    rarity: "common",
    price: 0,
    de: ["Turnschuhe", "Weiß. Vorerst."],
    en: ["Sneakers", "White. For now."],
  },
  {
    slug: "shoes-boots",
    assetKey: "shoes_boots",
    slot: "shoes",
    rarity: "rare",
    price: 280,
    de: ["Stiefel", "Für Wetter, das es hier gar nicht gibt."],
    en: ["Boots", "For weather this place doesn't have."],
  },

  // Accessories
  {
    slug: "acc-glasses",
    assetKey: "acc_glasses",
    slot: "accessory",
    rarity: "uncommon",
    price: 180,
    de: ["Brille", "Macht klüger. Wissenschaftlich unbelegt."],
    en: ["Glasses", "Makes you smarter. Scientifically unproven."],
  },
  {
    slug: "acc-cat-ears",
    assetKey: "acc_cat_ears",
    slot: "accessory",
    rarity: "legendary",
    price: 1200,
    de: ["Katzenohren", "Niemand hat gefragt. Niemand beschwert sich."],
    en: ["Cat ears", "Nobody asked. Nobody's complaining."],
  },

  // Backgrounds
  {
    slug: "bg-sky",
    assetKey: "bg_sky",
    slot: "background",
    rarity: "common",
    price: 0,
    de: ["Klarer Himmel", "Wetterbericht: unverändert."],
    en: ["Clear sky", "Forecast: unchanged."],
  },
  {
    slug: "bg-sakura",
    assetKey: "bg_sakura",
    slot: "background",
    rarity: "epic",
    price: 700,
    de: ["Kirschblüten", "Zwei Wochen im Jahr. Hier immer."],
    en: ["Cherry blossoms", "Two weeks a year. Here, always."],
  },
];

export async function importShop() {
  const bar = progress("Items");

  for (const [index, entry] of CATALOGUE.entries()) {
    const data = {
      name: { de: entry.de[0], en: entry.en[0] },
      description: { de: entry.de[1], en: entry.en[1] },
      slot: entry.slot,
      rarity: entry.rarity,
      price: entry.price,
      assetKey: entry.assetKey,
      order: index,
    };

    await db.shopItem.upsert({
      where: { slug: entry.slug },
      create: { slug: entry.slug, ...data },
      update: data,
    });
    bar.tick();
  }

  const free = CATALOGUE.filter((entry) => entry.price === 0).length;
  bar.done(` (${free} of them free to start with)`);
}
