-- CreateEnum
CREATE TYPE "SrsItemType" AS ENUM ('kana', 'word', 'kanji');

-- CreateEnum
CREATE TYPE "SrsState" AS ENUM ('new', 'learning', 'review', 'relearning');

-- CreateEnum
CREATE TYPE "SrsRating" AS ENUM ('again', 'hard', 'good', 'easy');

-- CreateTable
CREATE TABLE "srs_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" "SrsItemType" NOT NULL,
    "kanaId" TEXT,
    "wordId" TEXT,
    "kanjiId" TEXT,
    "state" "SrsState" NOT NULL DEFAULT 'new',
    "due" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "elapsedDays" INTEGER NOT NULL DEFAULT 0,
    "scheduledDays" INTEGER NOT NULL DEFAULT 0,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "lastReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "srs_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_logs" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" "SrsRating" NOT NULL,
    "state" "SrsState" NOT NULL,
    "stability" DOUBLE PRECISION NOT NULL,
    "difficulty" DOUBLE PRECISION NOT NULL,
    "elapsedDays" INTEGER NOT NULL,
    "scheduledDays" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_activity" (
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "newItems" INTEGER NOT NULL DEFAULT 0,
    "seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_activity_pkey" PRIMARY KEY ("userId","date")
);

-- CreateIndex
CREATE INDEX "srs_cards_userId_due_idx" ON "srs_cards"("userId", "due");

-- CreateIndex
CREATE INDEX "srs_cards_userId_itemType_state_idx" ON "srs_cards"("userId", "itemType", "state");

-- CreateIndex
CREATE UNIQUE INDEX "srs_cards_userId_kanaId_key" ON "srs_cards"("userId", "kanaId");

-- CreateIndex
CREATE UNIQUE INDEX "srs_cards_userId_wordId_key" ON "srs_cards"("userId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "srs_cards_userId_kanjiId_key" ON "srs_cards"("userId", "kanjiId");

-- CreateIndex
CREATE INDEX "review_logs_userId_reviewedAt_idx" ON "review_logs"("userId", "reviewedAt");

-- CreateIndex
CREATE INDEX "review_logs_cardId_reviewedAt_idx" ON "review_logs"("cardId", "reviewedAt");

-- CreateIndex
CREATE INDEX "daily_activity_date_idx" ON "daily_activity"("date");

-- AddForeignKey
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_kanaId_fkey" FOREIGN KEY ("kanaId") REFERENCES "kana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_kanjiId_fkey" FOREIGN KEY ("kanjiId") REFERENCES "kanji"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "srs_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
