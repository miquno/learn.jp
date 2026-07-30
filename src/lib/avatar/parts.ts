/**
 * The pixel artwork for the character.
 *
 * Each part is a character grid: one character per pixel, `.` means
 * transparent. SVG is drawn from it — that keeps the character crisp at any
 * size, allows recolouring, and weighs a few kilobytes instead of dozens of
 * image files.
 *
 * Everything here is drawn from scratch. Third-party sprite collections are
 * deliberately not used — their licences range from "attribution required" to
 * "share alike only", and neither belongs in a shop that makes money.
 */

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 28;

/** Colour roles. Skin and hair come from the user's settings. */
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
  /** The row at which the grid starts being drawn. */
  offsetY: number;
  /** Character → colour role. */
  legend: Record<string, ColorRole>;
  rows: string[];
};

const SKIN = { S: "skin", O: "skinShade" } as const;
const HAIR = { H: "hair", h: "hairShade" } as const;

// --- Body -----------------------------------------------------------------

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

// --- Hair -----------------------------------------------------------------

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

// --- Tops -----------------------------------------------------------------

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

// --- Bottoms --------------------------------------------------------------

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

// --- Shoes ----------------------------------------------------------------

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

// --- Accessories ----------------------------------------------------------

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

// --- Backgrounds ----------------------------------------------------------

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

// A miscounted row is the most likely mistake when drawing in an editor and is
// barely visible in the rendered image — so it is checked hard here.
for (const [key, part] of Object.entries({
  ...ALL_PARTS,
  base_feminine: BODIES.feminine,
  base_masculine: BODIES.masculine,
})) {
  for (const [index, row] of part.rows.entries()) {
    if (row.length !== GRID_WIDTH) {
      throw new Error(
        `Avatar part "${key}": row ${index} is ${row.length} pixels wide, expected ${GRID_WIDTH}.`,
      );
    }
  }
}
