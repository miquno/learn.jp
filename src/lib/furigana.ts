/**
 * Furigana as authored data, not auto-generated.
 *
 * A kanji's reading depends on context — 私 is わたし, but 今日 is きょう, not
 * こんにち, and no per-character lookup gets that right. Correct furigana needs
 * a morphological analyser, which we don't run. So readings are written by hand
 * alongside the sentence, in a compact bracket notation:
 *
 *   "[私|わたし]は[学生|がくせい]です。"
 *
 * `[text|reading]` marks a run that gets furigana; everything else (kana,
 * punctuation) is a plain run with no reading. `parseFurigana` turns that into
 * tokens for the <ruby> renderer, and `plainText` strips the readings back out
 * so we never store the sentence twice.
 */

export type FuriToken = { t: string; r?: string };

const TOKEN = /\[([^\]|]+)\|([^\]]+)\]|([^[]+)/g;

/** Parse bracket notation into tokens. Plain segments carry no reading. */
export function parseFurigana(annotated: string): FuriToken[] {
  const tokens: FuriToken[] = [];
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(annotated))) {
    if (match[1] !== undefined) {
      tokens.push({ t: match[1], r: match[2] });
    } else if (match[3]) {
      tokens.push({ t: match[3] });
    }
  }
  return tokens;
}

/** The sentence with all readings removed — the plain Japanese. */
export function plainText(annotated: string): string {
  return parseFurigana(annotated)
    .map((token) => token.t)
    .join("");
}
