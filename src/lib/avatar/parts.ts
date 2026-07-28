/**
 * Die Pixelgrafiken der Figur.
 *
 * Jedes Teil ist ein Zeichenraster: ein Zeichen pro Pixel, `.` bedeutet
 * durchsichtig. Gezeichnet wird daraus SVG — dadurch bleibt die Figur in
 * jeder Größe scharf, lässt sich umfärben und wiegt ein paar Kilobyte statt
 * Dutzender Bilddateien.
 *
 * Alles hier ist eigens gezeichnet. Fremde Sprite-Sammlungen sind bewusst
 * nicht verwendet — ihre Lizenzen reichen von "Namensnennung" bis "nur unter
 * gleicher Lizenz weitergeben", und beides will man nicht in einem Shop
 * haben, mit dem Geld verdient wird.
 */

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 28;

/** Farbrollen. Haut und Haare kommen aus den Einstellungen des Nutzers. */
export type ColorRole =
  | "skin"
  | "skinShade"
  | "hair"
  | "hairShade"
  | "eye"
  | "mouth"
  | "primary"
  | "secondary"
  | "accent";

export type Part = {
  /** Ab welcher Zeile das Raster gezeichnet wird. */
  offsetY: number;
  /** Zeichen → Farbrolle. */
  legend: Record<string, ColorRole>;
  rows: string[];
};

const SKIN = { S: "skin", O: "skinShade" } as const;
const HAIR = { H: "hair", h: "hairShade" } as const;

// --- Körper ---------------------------------------------------------------

const FACE = {
  ...SKIN,
  E: "eye",
  M: "mouth",
} as const;

export const BODIES: Record<"feminine" | "masculine", Part> = {
  feminine: {
    offsetY: 0,
    legend: FACE,
    rows: [
      "....................",
      "......OOOOOOOO......",
      ".....OSSSSSSSSO.....",
      "....OSSSSSSSSSSO....",
      "....OSSSSSSSSSSO....",
      "....OSSSSSSSSSSO....",
      "....OSSEESSEESSO....",
      "....OSSEESSEESSO....",
      "....OSSSSSSSSSSO....",
      "....OSSSMMMMSSSO....",
      ".....OSSSSSSSSO.....",
      "......OOSSSSOO......",
      "........OSSO........",
      ".......OSSSSO.......",
      ".....OOSSSSSSOO.....",
      "....OSSSSSSSSSSO....",
      "....OSSSSSSSSSSO....",
      "....OSSSSSSSSSSO....",
      "....OSSSSSSSSSSO....",
      ".....OSSSSSSSSO.....",
      ".....OSSSSSSSSO.....",
      "......OSSSSSSO......",
      "......OSSOOSSO......",
      "......OSSOOSSO......",
      "......OSSOOSSO......",
      "......OSSOOSSO......",
      ".....OOSSOOSSOO.....",
      "....................",
    ],
  },
  masculine: {
    offsetY: 0,
    legend: FACE,
    rows: [
      "....................",
      "......OOOOOOOO......",
      ".....OSSSSSSSSO.....",
      "....OSSSSSSSSSSO....",
      "....OSSSSSSSSSSO....",
      "....OSSSSSSSSSSO....",
      "....OSSEESSEESSO....",
      "....OSSEESSEESSO....",
      "....OSSSSSSSSSSO....",
      "....OSSSMMMMSSSO....",
      ".....OSSSSSSSSO.....",
      "......OOSSSSOO......",
      "........OSSO........",
      "......OOSSSSOO......",
      "....OOSSSSSSSSOO....",
      "...OSSSSSSSSSSSSO...",
      "...OSSSSSSSSSSSSO...",
      "...OSSSSSSSSSSSSO...",
      "....OSSSSSSSSSSO....",
      "....OSSSSSSSSSSO....",
      ".....OSSSSSSSSO.....",
      "......OSSSSSSO......",
      "......OSSOOSSO......",
      "......OSSOOSSO......",
      "......OSSOOSSO......",
      "......OSSOOSSO......",
      ".....OOSSOOSSOO.....",
      "....................",
    ],
  },
};

// --- Haare ----------------------------------------------------------------

export const HAIR_PARTS: Record<string, Part> = {
  hair_short: {
    offsetY: 0,
    legend: HAIR,
    rows: [
      "......hhhhhhhh......",
      ".....hHHHHHHHHh.....",
      "....hHHHHHHHHHHh....",
      "....hHHHHHHHHHHh....",
      "....hHH......HHh....",
      "....hH........Hh....",
    ],
  },
  hair_twin: {
    offsetY: 0,
    legend: HAIR,
    rows: [
      "......hhhhhhhh......",
      ".....hHHHHHHHHh.....",
      "....hHHHHHHHHHHh....",
      "...hHHHHHHHHHHHHh...",
      "..hHHHH......HHHHh..",
      "..hHHHh......hHHHh..",
      "..hHHHh......hHHHh..",
      "..hHHHh......hHHHh..",
      "...hHHh......hHHh...",
      "....hh........hh....",
    ],
  },
  hair_long: {
    offsetY: 0,
    legend: HAIR,
    rows: [
      "......hhhhhhhh......",
      ".....hHHHHHHHHh.....",
      "....hHHHHHHHHHHh....",
      "...hHHHHHHHHHHHHh...",
      "...hHHH......HHHh...",
      "...hHH........HHh...",
      "...hHH........HHh...",
      "...hHH........HHh...",
      "...hHH........HHh...",
      "...hHH........HHh...",
      "...hHHh......hHHh...",
      "....hHh......hHh....",
      "....hh........hh....",
    ],
  },
};

// --- Oberteile ------------------------------------------------------------

const CLOTH = { C: "primary", c: "secondary" } as const;

export const TOP_PARTS: Record<string, Part> = {
  top_tee: {
    offsetY: 14,
    legend: CLOTH,
    rows: [
      ".....CCCCCCCCCC.....",
      "....CCCCCCCCCCCC....",
      "....CCCCCCCCCCCC....",
      "....CCCCCCCCCCCC....",
      "....CCCCCCCCCCCC....",
      ".....CCCCCCCCCC.....",
    ],
  },
  top_hoodie: {
    offsetY: 13,
    legend: CLOTH,
    rows: [
      "......cccccc........",
      "....ccCCCCCCcc......",
      "...cCCCCCCCCCCc.....",
      "...cCCCCccCCCCc.....",
      "...cCCCCccCCCCc.....",
      "...cCCCCCCCCCCc.....",
      "....cCCCCCCCCc......",
    ],
  },
  top_sailor: {
    offsetY: 14,
    legend: CLOTH,
    rows: [
      ".....CCCCCCCCCC.....",
      "....CCccCCCCccCC....",
      "....CCcccccccCCC....",
      "....CCCCcccCCCCC....",
      "....CCCCCCCCCCCC....",
      ".....CCCCCCCCCC.....",
    ],
  },
};

// --- Unterteile -----------------------------------------------------------

const BOTTOM = { D: "primary", d: "secondary" } as const;

export const BOTTOM_PARTS: Record<string, Part> = {
  bottom_skirt: {
    offsetY: 20,
    legend: BOTTOM,
    rows: [
      ".....DDDDDDDDDD.....",
      "....DDdDDdDDdDDD....",
      "...DDDDDDDDDDDDDD...",
    ],
  },
  bottom_jeans: {
    offsetY: 20,
    legend: BOTTOM,
    rows: [
      ".....DDDDDDDDDD.....",
      "......DDDDDDDD......",
      "......DDD..DDD......",
      "......DDD..DDD......",
      "......DDD..DDD......",
      "......DDD..DDD......",
    ],
  },
};

// --- Schuhe ---------------------------------------------------------------

const SHOE = { F: "primary", f: "secondary" } as const;

export const SHOE_PARTS: Record<string, Part> = {
  shoes_sneakers: {
    offsetY: 26,
    legend: SHOE,
    rows: ["....FFFFF..FFFFF...."],
  },
  shoes_boots: {
    offsetY: 24,
    legend: SHOE,
    rows: [
      "......FFF..FFF......",
      "......fff..fff......",
      ".....FFFFF..FFFFF...",
    ],
  },
};

// --- Zubehör --------------------------------------------------------------

const ACCENT = { A: "accent", a: "primary" } as const;

export const ACCESSORY_PARTS: Record<string, Part> = {
  acc_glasses: {
    offsetY: 6,
    legend: ACCENT,
    rows: ["...AAAAAaAAAAA......", "...A..A...A..A......"],
  },
  acc_cat_ears: {
    offsetY: 0,
    legend: ACCENT,
    rows: [
      "....AA........AA....",
      "....AAA......AAA....",
      ".....AAa....aAA.....",
    ],
  },
};

// --- Hintergründe ---------------------------------------------------------

const SCENE = { B: "primary", b: "secondary", A: "accent" } as const;

export const BACKGROUND_PARTS: Record<string, Part> = {
  bg_sky: {
    offsetY: 0,
    legend: SCENE,
    rows: Array.from({ length: GRID_HEIGHT }, (_, y) =>
      y > 22 ? "bbbbbbbbbbbbbbbbbbbb" : "BBBBBBBBBBBBBBBBBBBB",
    ),
  },
  bg_sakura: {
    offsetY: 0,
    legend: SCENE,
    rows: [
      "BBBBBBBBBBBBBBBBBBBB",
      "BBAABBBBBBBBBBBAABBB",
      "BBBBBBBBAABBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BAABBBBBBBBBBBBBBAAB",
      "BBBBBBBBBBBAABBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BBBBBAABBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBAABBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BBAABBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBAABBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBAABB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BBBAABBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBAABBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBAABBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBB",
      "bbbbbbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbbbbbb",
      "bbbbbbbbbbbbbbbbbbbb",
    ],
  },
};

export const ALL_PARTS: Record<string, Part> = {
  ...HAIR_PARTS,
  ...TOP_PARTS,
  ...BOTTOM_PARTS,
  ...SHOE_PARTS,
  ...ACCESSORY_PARTS,
  ...BACKGROUND_PARTS,
};

// Falsch abgezählte Zeilen sind der wahrscheinlichste Fehler beim Zeichnen im
// Editor und im gerenderten Bild kaum zu erkennen — deshalb hier hart prüfen.
for (const [key, part] of Object.entries({
  ...ALL_PARTS,
  base_feminine: BODIES.feminine,
  base_masculine: BODIES.masculine,
})) {
  for (const [index, row] of part.rows.entries()) {
    if (row.length !== GRID_WIDTH) {
      throw new Error(
        `Avatar-Teil "${key}": Zeile ${index} ist ${row.length} Pixel breit, erwartet ${GRID_WIDTH}.`,
      );
    }
  }
}
