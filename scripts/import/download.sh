#!/usr/bin/env bash
# Downloads the raw data for the content importers into data/raw.
# Idempotent: files that already exist are skipped.
#
# Every source is openly licensed but requires attribution — see the
# /credits page.
set -euo pipefail

DEST="$(cd "$(dirname "$0")/../.." && pwd)/data/raw"
mkdir -p "$DEST"

# KanjiVG publishes dated releases. The version is pinned here on purpose so
# rebuilding the database stays reproducible.
KANJIVG_RELEASE="r20250816"
KANJIVG_FILE="kanjivg-20250816.xml.gz"

fetch() {
  local url="$1" name="$2"
  if [ -s "$DEST/$name" ]; then
    printf '  skipped (already present): %s\n' "$name"
    return
  fi
  printf '  downloading: %s\n' "$name"
  curl -fSL --retry 3 --connect-timeout 30 -o "$DEST/$name.part" "$url"
  mv "$DEST/$name.part" "$DEST/$name"
}

echo "JMdict + KANJIDIC2 (EDRDG, CC BY-SA 4.0)"
fetch "http://ftp.edrdg.org/pub/Nihongo/JMdict.gz" "JMdict.gz"
fetch "http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz" "kanjidic2.xml.gz"

echo "KanjiVG (CC BY-SA 3.0)"
fetch "https://github.com/KanjiVG/kanjivg/releases/download/${KANJIVG_RELEASE}/${KANJIVG_FILE}" "kanjivg.xml.gz"

echo "Tatoeba (CC BY 2.0 FR)"
# Per language rather than the combined export, and links per language pair:
# links.tar.bz2 would be 142 MB covering every language combination, while
# jpn-deu and jpn-eng together are under 2 MB.
TB="https://downloads.tatoeba.org/exports/per_language"
fetch "$TB/jpn/jpn_sentences.tsv.bz2" "jpn_sentences.tsv.bz2"
fetch "$TB/deu/deu_sentences.tsv.bz2" "deu_sentences.tsv.bz2"
fetch "$TB/eng/eng_sentences.tsv.bz2" "eng_sentences.tsv.bz2"
fetch "$TB/jpn/jpn-deu_links.tsv.bz2" "jpn-deu_links.tsv.bz2"
fetch "$TB/jpn/jpn-eng_links.tsv.bz2" "jpn-eng_links.tsv.bz2"

echo
echo "Done. Contents of data/raw:"
du -h "$DEST"/* | sort -k2
