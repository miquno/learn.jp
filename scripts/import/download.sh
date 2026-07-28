#!/usr/bin/env bash
# Lädt die Rohdaten für die Content-Importer nach data/raw/.
# Idempotent: bereits vorhandene Dateien werden übersprungen (--continue).
#
# Alle Quellen sind offen lizenziert, verlangen aber Namensnennung —
# siehe die Seite /credits.
set -euo pipefail

DEST="$(cd "$(dirname "$0")/../.." && pwd)/data/raw"
mkdir -p "$DEST"

# KanjiVG veröffentlicht datierte Releases. Version hier bewusst festgenagelt,
# damit ein Neuaufbau der Datenbank reproduzierbar bleibt.
KANJIVG_RELEASE="r20250816"
KANJIVG_FILE="kanjivg-20250816.xml.gz"

fetch() {
  local url="$1" name="$2"
  if [ -s "$DEST/$name" ]; then
    printf '  übersprungen (vorhanden): %s\n' "$name"
    return
  fi
  printf '  lade: %s\n' "$name"
  curl -fSL --retry 3 --connect-timeout 30 -o "$DEST/$name.part" "$url"
  mv "$DEST/$name.part" "$DEST/$name"
}

echo "JMdict + KANJIDIC2 (EDRDG, CC BY-SA 4.0)"
fetch "http://ftp.edrdg.org/pub/Nihongo/JMdict.gz" "JMdict.gz"
fetch "http://ftp.edrdg.org/pub/Nihongo/kanjidic2.xml.gz" "kanjidic2.xml.gz"

echo "KanjiVG (CC BY-SA 3.0)"
fetch "https://github.com/KanjiVG/kanjivg/releases/download/${KANJIVG_RELEASE}/${KANJIVG_FILE}" "kanjivg.xml.gz"

echo "Tatoeba (CC BY 2.0 FR)"
# Pro Sprache statt Gesamtexport, und die Verknüpfungen paarweise:
# links.tar.bz2 wäre 142 MB für alle Sprachkombinationen, jpn-deu und
# jpn-eng zusammen sind unter 2 MB.
TB="https://downloads.tatoeba.org/exports/per_language"
fetch "$TB/jpn/jpn_sentences.tsv.bz2" "jpn_sentences.tsv.bz2"
fetch "$TB/deu/deu_sentences.tsv.bz2" "deu_sentences.tsv.bz2"
fetch "$TB/eng/eng_sentences.tsv.bz2" "eng_sentences.tsv.bz2"
fetch "$TB/jpn/jpn-deu_links.tsv.bz2" "jpn-deu_links.tsv.bz2"
fetch "$TB/jpn/jpn-eng_links.tsv.bz2" "jpn-eng_links.tsv.bz2"

echo
echo "Fertig. Inhalt von data/raw:"
du -h "$DEST"/* | sort -k2
