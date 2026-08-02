import type { FuriToken } from "@/lib/furigana";

/**
 * Renders a Japanese sentence with furigana using native <ruby>.
 *
 * Tokens with a reading become <ruby>漢字<rt>かんじ</rt></ruby>; plain tokens
 * (kana, punctuation) render as-is. Falls back to plain text when there are no
 * tokens, so a sentence without authored readings still shows.
 */
export function Furigana({
  tokens,
  plain,
  className,
}: {
  tokens?: FuriToken[] | null;
  /** Shown when no tokens are available. */
  plain?: string;
  className?: string;
}) {
  if (!tokens || tokens.length === 0) {
    return <span className={className}>{plain}</span>;
  }

  return (
    <span className={className}>
      {tokens.map((token, index) =>
        token.r ? (
          <ruby key={index}>
            {token.t}
            {/* rp parentheses show only where <ruby> isn't supported, so a
                fallback reader still sees 漢字(かんじ). */}
            <rp>(</rp>
            <rt>{token.r}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <span key={index}>{token.t}</span>
        ),
      )}
    </span>
  );
}
