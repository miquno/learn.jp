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
 * Node bringt kein bzip2 mit. Statt eine Abhängigkeit dafür aufzunehmen,
 * wird `bzcat` benutzt — auf macOS und jeder Linux-Distribution vorhanden.
 */
export function openBzip2(file: string): Readable {
  const child = spawn("bzcat", [path.join(RAW_DIR, file)], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  return child.stdout;
}

/**
 * Liefert die Rohtexte aller `<tag>…</tag>`-Elemente eines XML-Stroms.
 *
 * Bewusst kein XML-Parser: JMdict und KANJIDIC2 sind streng maschinell
 * erzeugt und in dieser Größenordnung (218.000 Einträge, ~350 MB entpackt)
 * ist ein zeichenweise arbeitender Parser langsamer als das Zerschneiden am
 * Elementende. Verschachtelte Elemente gleichen Namens gibt es in keiner der
 * Quellen.
 */
export async function* streamElements(
  stream: Readable,
  tag: string,
): AsyncGenerator<string> {
  // Das öffnende Tag kann Attribute tragen (`<kanji id="…">`), deshalb wird
  // nur das Präfix gesucht und danach geprüft, dass wirklich das Tag endet
  // und nicht ein längerer Name anfängt (`<kanji>` vs. `<kanjivg>`).
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

    // Der Rest kann nur noch ein angefangenes Element sein. Wenn nicht einmal
    // ein öffnendes Tag drin steht, ist es Beiwerk (DTD, Kommentare) und kann
    // weg — sonst wächst der Puffer über die ganze Datei.
    const lastOpen = buffer.lastIndexOf(open);
    if (lastOpen > 0) buffer = buffer.slice(lastOpen);
    else if (lastOpen === -1 && buffer.length > open.length) {
      buffer = buffer.slice(-open.length);
    }
  }
}

/** Alle Textinhalte eines Elements, z. B. `all(xml, "keb")`. */
export function all(xml: string, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]*)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(decodeEntities(m[1]));
  return out;
}

/** Erster Textinhalt eines Elements oder `undefined`. */
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

/** Fortschrittsanzeige, die eine Zeile überschreibt statt zu scrollen. */
export function progress(label: string) {
  let count = 0;
  let last = Date.now();
  return {
    tick(by = 1) {
      count += by;
      if (Date.now() - last > 400) {
        process.stdout.write(`\r  ${label}: ${count.toLocaleString("de-DE")}`);
        last = Date.now();
      }
    },
    done(suffix = "") {
      // Auf Zeilenbreite auffüllen, sonst bleiben Reste der längeren
      // Zwischenstände hinter der Endzahl stehen.
      const line = `  ${label}: ${count.toLocaleString("de-DE")}${suffix}`;
      process.stdout.write(`\r${line.padEnd(60)}\n`);
      return count;
    },
    get count() {
      return count;
    },
  };
}
