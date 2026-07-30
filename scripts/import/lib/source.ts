import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import path from "node:path";
import { createGunzip } from "node:zlib";
import type { Readable } from "node:stream";

export const RAW_DIR = path.join(process.cwd(), "data", "raw");

export function openGzip(file: string): Readable {
  return createReadStream(path.join(RAW_DIR, file)).pipe(createGunzip());
}

/**
 * Node has no bzip2. Rather than taking a dependency for it, `bzcat` is used —
 * present on macOS and every Linux distribution.
 */
export function openBzip2(file: string): Readable {
  const child = spawn("bzcat", [path.join(RAW_DIR, file)], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  return child.stdout;
}

/**
 * Yields the raw text of every `<tag>…</tag>` element in an XML stream.
 *
 * Deliberately not an XML parser: JMdict and KANJIDIC2 are strictly
 * machine-generated, and at this size (218,000 entries, ~350 MB uncompressed)
 * a character-by-character parser is slower than slicing at element
 * boundaries. Neither source nests elements of the same name.
 */
export async function* streamElements(
  stream: Readable,
  tag: string,
): AsyncGenerator<string> {
  // The opening tag can carry attributes (`<kanji id="…">`), so only the
  // prefix is searched and it is then checked that the tag really ends there
  // rather than a longer name starting (`<kanji>` vs `<kanjivg>`).
  const open = `<${tag}`;
  const close = `</${tag}>`;
  let buffer = "";

  const openAt = (upTo: number) => {
    let index = buffer.lastIndexOf(open, upTo);
    while (index !== -1) {
      const after = buffer[index + open.length];
      if (after === ">" || after === " " || after === "\n" || after === "\t") {
        return index;
      }
      index = buffer.lastIndexOf(open, index - 1);
    }
    return -1;
  };

  stream.setEncoding("utf8");
  for await (const chunk of stream) {
    buffer += chunk;

    let end: number;
    while ((end = buffer.indexOf(close)) !== -1) {
      const start = openAt(end);
      if (start !== -1) {
        yield buffer.slice(start, end + close.length);
      }
      buffer = buffer.slice(end + close.length);
    }

    // What remains can only be a partial element. If it doesn't even contain
    // an opening tag it is incidental (DTD, comments) and can go — otherwise
    // the buffer grows to the size of the whole file.
    const lastOpen = buffer.lastIndexOf(open);
    if (lastOpen > 0) buffer = buffer.slice(lastOpen);
    else if (lastOpen === -1 && buffer.length > open.length) {
      buffer = buffer.slice(-open.length);
    }
  }
}

/** All text contents of an element, e.g. `all(xml, "keb")`. */
export function all(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(decodeEntities(m[1]));
  return out;
}

/** First text content of an element, or `undefined`. */
export function first(xml: string, tag: string): string | undefined {
  return all(xml, tag)[0];
}

export function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Progress display that overwrites one line instead of scrolling. */
export function progress(label: string) {
  let count = 0;
  let last = Date.now();
  return {
    tick(by = 1) {
      count += by;
      if (Date.now() - last > 400) {
        process.stdout.write(`\r  ${label}: ${count.toLocaleString("en-GB")}`);
        last = Date.now();
      }
    },
    done(suffix = "") {
      // Pad to line width, or remnants of the longer intermediate values
      // linger after the final number.
      const line = `  ${label}: ${count.toLocaleString("en-GB")}${suffix}`;
      process.stdout.write(`\r${line.padEnd(60)}\n`);
      return count;
    },
    get count() {
      return count;
    },
  };
}
