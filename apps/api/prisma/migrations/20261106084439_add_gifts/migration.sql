-- AlterTable
ALTER TABLE "SurveySession" ADD COLUMN     "giftId" TEXT,
ADD COLUMN     "giftNameSnapshot" TEXT;

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "packageInfo" TEXT NOT NULL,
    "priceVnd" INTEGER NOT NULL,
    "note" TEXT,
    "imageUrl" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SurveySession" ADD CONSTRAINT "SurveySession_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
