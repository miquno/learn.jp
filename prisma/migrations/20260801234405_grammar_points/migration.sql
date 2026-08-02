-- AlterEnum
ALTER TYPE "SrsItemType" ADD VALUE 'grammar';

-- AlterTable
ALTER TABLE "srs_cards" ADD COLUMN     "grammarId" TEXT;

-- CreateTable
CREATE TABLE "grammar_points" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "meaning" JSONB NOT NULL,
    "explanation" JSONB NOT NULL,
    "examples" JSONB NOT NULL,
    "jlptLevel" "JlptLevel" NOT NULL,
    "order" INTEGER NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grammar_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grammar_points_slug_key" ON "grammar_points"("slug");

-- CreateIndex
CREATE INDEX "grammar_points_jlptLevel_order_idx" ON "grammar_points"("jlptLevel", "order");

-- CreateIndex
CREATE UNIQUE INDEX "srs_cards_userId_grammarId_key" ON "srs_cards"("userId", "grammarId");

-- AddForeignKey
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES "grammar_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

