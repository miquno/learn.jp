/**
 * Kana kommen nicht aus einem Download — es sind 214 feste Zeichen, und die
 * Lernreihenfolge ist didaktisch gesetzt, nicht aus Daten ableitbar.
 *
 * Reihenfolge: erst die Grundtafel (あ-Reihe bis ん), dann Dakuten und
 * Handakuten, zuletzt die Kombinationen. Genau so wird sie im Lernpfad
 * abgearbeitet.
 */
import type { KanaType } from "../../src/generated/prisma/enums";

import { db } from "./lib/db";
import { toRomaji } from "./lib/romaji";
import { progress } from "./lib/source";

type Row = { row: string; type: KanaType; hiragana: string[] };

const BASIC: Row[] = [
  { row: "a", type: "basic", hiragana: ["あ", "い", "う", "え", "お"] },
  { row: "ka", type: "basic", hiragana: ["か", "き", "く", "け", "こ"] },
  { row: "sa", type: "basic", hiragana: ["さ", "し", "す", "せ", "そ"] },
  { row: "ta", type: "basic", hiragana: ["た", "ち", "つ", "て", "と"] },
  { row: "na", type: "basic", hiragana: ["な", "に", "ぬ", "ね", "の"] },
  { row: "ha", type: "basic", hiragana: ["は", "ひ", "ふ", "へ", "ほ"] },
  { row: "ma", type: "basic", hiragana: ["ま", "み", "む", "め", "も"] },
  { row: "ya", type: "basic", hiragana: ["や", "ゆ", "よ"] },
  { row: "ra", type: "basic", hiragana: ["ら", "り", "る", "れ", "ろ"] },
  { row: "wa", type: "basic", hiragana: ["わ", "を"] },
  { row: "n", type: "basic", hiragana: ["ん"] },
  { row: "ga", type: "dakuten", hiragana: ["が", "ぎ", "ぐ", "げ", "ご"] },
  { row: "za", type: "dakuten", hiragana: ["ざ", "じ", "ず", "ぜ", "ぞ"] },
  { row: "da", type: "dakuten", hiragana: ["だ", "ぢ", "づ", "で", "ど"] },
  { row: "ba", type: "dakuten", hiragana: ["ば", "び", "ぶ", "べ", "ぼ"] },
  { row: "pa", type: "handakuten", hiragana: ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"] },
  { row: "kya", type: "combo", hiragana: ["きゃ", "きゅ", "きょ"] },
  { row: "sha", type: "combo", hiragana: ["しゃ", "しゅ", "しょ"] },
  { row: "cha", type: "combo", hiragana: ["ちゃ", "ちゅ", "ちょ"] },
  { row: "nya", type: "combo", hiragana: ["にゃ", "にゅ", "にょ"] },
  { row: "hya", type: "combo", hiragana: ["ひゃ", "ひゅ", "ひょ"] },
  { row: "mya", type: "combo", hiragana: ["みゃ", "みゅ", "みょ"] },
  { row: "rya", type: "combo", hiragana: ["りゃ", "りゅ", "りょ"] },
  { row: "gya", type: "combo", hiragana: ["ぎゃ", "ぎゅ", "ぎょ"] },
  { row: "ja", type: "combo", hiragana: ["じゃ", "じゅ", "じょ"] },
  { row: "bya", type: "combo", hiragana: ["びゃ", "びゅ", "びょ"] },
  { row: "pya", type: "combo", hiragana: ["ぴゃ", "ぴゅ", "ぴょ"] },
];

/**
 * Beim Lernen der Kana-Tafel abweichende Umschrift.
 *
 * を wird als Wort-Partikel "o" gesprochen, in der Kana-Tafel aber überall
 * als "wo" gelehrt — sonst stünden あ und を beide unter "o" und die Abfrage
 * wäre nicht eindeutig beantwortbar.
 */
const LESSON_ROMAJI: Record<string, string> = {
  を: "wo",
};

function toKatakana(hiragana: string): string {
  return hiragana.replace(/[ぁ-ゖ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60),
  );
}

export async function importKana() {
  const bar = progress("Kana");
  let order = 0;

  for (const { row, type, hiragana } of BASIC) {
    for (const character of hiragana) {
      const romaji = LESSON_ROMAJI[character] ?? toRomaji(character);
      order += 1;

      for (const script of ["hiragana", "katakana"] as const) {
        const value = script === "hiragana" ? character : toKatakana(character);
        await db.kana.upsert({
          where: { character_script: { character: value, script } },
          create: { character: value, romaji, script, type, row, order },
          update: { romaji, type, row, order },
        });
        bar.tick();
      }
    }
  }

  bar.done();
}
