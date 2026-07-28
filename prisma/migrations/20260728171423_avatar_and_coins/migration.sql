-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

-- CreateEnum
CREATE TYPE "AvatarSlot" AS ENUM ('background', 'hair_back', 'body', 'bottom', 'top', 'shoes', 'hair', 'accessory');

-- CreateEnum
CREATE TYPE "AvatarBase" AS ENUM ('feminine', 'masculine');

-- CreateTable
CREATE TABLE "shop_items" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "slot" "AvatarSlot" NOT NULL,
    "rarity" "ItemRarity" NOT NULL,
    "price" INTEGER NOT NULL,
    "assetKey" TEXT NOT NULL,
    "onlyBase" "AvatarBase",
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "shop_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("userId","itemId")
);

-- CreateTable
CREATE TABLE "avatar_loadouts" (
    "userId" TEXT NOT NULL,
    "base" "AvatarBase" NOT NULL DEFAULT 'feminine',
    "skinTone" TEXT NOT NULL DEFAULT '#f2c9a0',
    "hairColor" TEXT NOT NULL DEFAULT '#3b2a24',
    "equipped" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avatar_loadouts_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "coin_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_items_slug_key" ON "shop_items"("slug");

-- CreateIndex
CREATE INDEX "shop_items_slot_price_idx" ON "shop_items"("slot", "price");

-- CreateIndex
CREATE INDEX "coin_transactions_userId_createdAt_idx" ON "coin_transactions"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "shop_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avatar_loadouts" ADD CONSTRAINT "avatar_loadouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
