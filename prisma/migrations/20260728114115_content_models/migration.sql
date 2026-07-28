-- CreateEnum
CREATE TYPE "KanaScript" AS ENUM ('hiragana', 'katakana');

-- CreateEnum
CREATE TYPE "KanaType" AS ENUM ('basic', 'dakuten', 'handakuten', 'combo');

-- CreateEnum
CREATE TYPE "WordClass" AS ENUM ('godan', 'ichidan', 'irregular', 'i_adjective', 'na_adjective', 'other');

-- CreateTable
CREATE TABLE "kana" (
    "id" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "romaji" TEXT NOT NULL,
    "script" "KanaScript" NOT NULL,
    "type" "KanaType" NOT NULL DEFAULT 'basic',
    "row" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "kana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" TEXT NOT NULL,
    "sourceId" INTEGER,
    "written" TEXT,
    "reading" TEXT NOT NULL,
    "romaji" TEXT NOT NULL,
    "meanings" JSONB NOT NULL,
    "partOfSpeech" TEXT[],
    "wordClass" "WordClass" NOT NULL DEFAULT 'other',
    "jlptLevel" "JlptLevel",
    "frequency" INTEGER,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanji" (
    "id" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "meanings" JSONB NOT NULL,
    "onyomi" TEXT[],
    "kunyomi" TEXT[],
    "strokeCount" INTEGER NOT NULL,
    "jlptLevel" "JlptLevel",
    "grade" INTEGER,
    "frequency" INTEGER,
    "strokeOrder" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radicals" (
    "id" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "meanings" JSONB NOT NULL,
    "reading" TEXT,
    "strokeCount" INTEGER NOT NULL,

    CONSTRAINT "radicals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanji_radicals" (
    "kanjiId" TEXT NOT NULL,
    "radicalId" TEXT NOT NULL,

    CONSTRAINT "kanji_radicals_pkey" PRIMARY KEY ("kanjiId","radicalId")
);

-- CreateTable
CREATE TABLE "kanji_words" (
    "kanjiId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,

    CONSTRAINT "kanji_words_pkey" PRIMARY KEY ("kanjiId","wordId")
);

-- CreateTable
CREATE TABLE "sentences" (
    "id" TEXT NOT NULL,
    "sourceId" INTEGER,
    "japanese" TEXT NOT NULL,
    "translations" JSONB NOT NULL,
    "charCount" INTEGER NOT NULL,
    "kanjiCount" INTEGER NOT NULL,
    "jlptLevel" "JlptLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sentences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_sentences" (
    "wordId" TEXT NOT NULL,
    "sentenceId" TEXT NOT NULL,

    CONSTRAINT "word_sentences_pkey" PRIMARY KEY ("wordId","sentenceId")
);

-- CreateIndex
CREATE INDEX "kana_script_order_idx" ON "kana"("script", "order");

-- CreateIndex
CREATE UNIQUE INDEX "kana_character_script_key" ON "kana"("character", "script");

-- CreateIndex
CREATE UNIQUE INDEX "words_sourceId_key" ON "words"("sourceId");

-- CreateIndex
CREATE INDEX "words_jlptLevel_frequency_idx" ON "words"("jlptLevel", "frequency");

-- CreateIndex
CREATE INDEX "words_reading_idx" ON "words"("reading");

-- CreateIndex
CREATE UNIQUE INDEX "kanji_character_key" ON "kanji"("character");

-- CreateIndex
CREATE INDEX "kanji_jlptLevel_frequency_idx" ON "kanji"("jlptLevel", "frequency");

-- CreateIndex
CREATE INDEX "kanji_grade_idx" ON "kanji"("grade");

-- CreateIndex
CREATE UNIQUE INDEX "radicals_character_key" ON "radicals"("character");

-- CreateIndex
CREATE UNIQUE INDEX "sentences_sourceId_key" ON "sentences"("sourceId");

-- CreateIndex
CREATE INDEX "sentences_jlptLevel_charCount_idx" ON "sentences"("jlptLevel", "charCount");

-- CreateIndex
CREATE INDEX "word_sentences_sentenceId_idx" ON "word_sentences"("sentenceId");

-- AddForeignKey
ALTER TABLE "kanji_radicals" ADD CONSTRAINT "kanji_radicals_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanji_radicals" ADD CONSTRAINT "kanji_radicals_radicalId_fkey" FOREIGN KEY ("radicalId") REFERENCES "radicals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanji_words" ADD CONSTRAINT "kanji_words_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanji_words" ADD CONSTRAINT "kanji_words_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_sentences" ADD CONSTRAINT "word_sentences_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_sentences" ADD CONSTRAINT "word_sentences_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "sentences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
