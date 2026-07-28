import type { ColorRole } from "./parts";

/** Farbsatz eines Kleidungsstücks. */
export type ItemPalette = {
  primary: string;
  secondary: string;
  accent: string;
};

/**
 * Farben je Grafik. Bewusst im Code statt in der Datenbank: sie gehören zur
 * Zeichnung, nicht zum Katalog — ein Kleidungsstück umzufärben heißt, ein
 * neues Kleidungsstück zu entwerfen.
 */
export const ITEM_PALETTES: Record<string, ItemPalette> = {
  top_tee: { primary: "#e8604c", secondary: "#c04435", accent: "#ffffff" },
  top_hoodie: { primary: "#4a6fd4", secondary: "#33509e", accent: "#ffffff" },
  top_sailor: { primary: "#f4f4f8", secondary: "#2c4a8c", accent: "#d94f6a" },

  bottom_skirt: { primary: "#2c3560", secondary: "#1d2444", accent: "#ffffff" },
  bottom_jeans: { primary: "#3c5f96", secondary: "#2b466f", accent: "#ffffff" },

  shoes_sneakers: { primary: "#f4f4f8", secondary: "#c9c9d4", accent: "#e8604c" },
  shoes_boots: { primary: "#5a3b2a", secondary: "#3f2a1d", accent: "#2a1a12" },

  acc_glasses: { primary: "#1a1a20", secondary: "#1a1a20", accent: "#2a2a34" },
  acc_cat_ears: { primary: "#f2a8bd", secondary: "#d97f99", accent: "#3b2a24" },

  bg_sky: { primary: "#8fc4e8", secondary: "#7fae6a", accent: "#ffffff" },
  bg_sakura: { primary: "#f7d3de", secondary: "#7fae6a", accent: "#ee8fae" },
};

/** Dunklere Variante einer Hex-Farbe — für Umrisse und Schatten. */
export function shade(hex: string, amount = 0.62): string {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) =>
    Math.round(Number.parseInt(value.slice(offset, offset + 2), 16) * amount),
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export type AvatarColors = Record<ColorRole, string>;

export function resolveColors(
  skinTone: string,
  hairColor: string,
  item?: ItemPalette,
): AvatarColors {
  return {
    skin: skinTone,
    skinShade: shade(skinTone),
    hair: hairColor,
    hairShade: shade(hairColor, 0.7),
    eye: "#2b2b38",
    mouth: shade(skinTone, 0.5),
    primary: item?.primary ?? "#888895",
    secondary: item?.secondary ?? "#606070",
    accent: item?.accent ?? "#ffffff",
  };
}

/** Auswahl für die Farbwähler im Avatar-Studio. */
export const SKIN_TONES = [
  "#f7dcc0",
  "#f2c9a0",
  "#dda578",
  "#b87f52",
  "#8a5a38",
  "#5e3b26",
];

export const HAIR_COLORS = [
  "#241a16",
  "#3b2a24",
  "#7a4a2a",
  "#c9a24a",
  "#d4d4dc",
  "#8c4a8c",
  "#4a7a8c",
  "#c05a6a",
];
