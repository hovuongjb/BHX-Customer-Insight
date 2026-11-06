-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'REGION_MANAGER', 'SHOP_MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "SessionSource" AS ENUM ('QR', 'STAFF');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "GroupQuestionKey" AS ENUM ('Q1', 'Q2');

-- CreateEnum
CREATE TYPE "QuestionKey" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4A', 'Q4B', 'Q4C', 'Q4D', 'Q4E');

-- CreateEnum
CREATE TYPE "FactorKey" AS ENUM ('PRICE', 'PROMOTION', 'BRAND', 'PACKAGE_SIZE', 'PRODUCT_TYPE', 'OTHER', 'NONE');

-- CreateEnum
CREATE TYPE "DetailType" AS ENUM ('PRICE', 'PROMOTION', 'BRAND', 'PACKAGE_SIZE', 'PRODUCT_TYPE');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('UNASSESSED', 'REVIEWING', 'APPROVED_PILOT', 'PILOTING', 'DEPLOYED', 'NOT_DEPLOYED');

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "regionId" TEXT,
    "shopId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopQrCode" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ShopQrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductGroup" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "ProductGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageSize" (
    "id" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PackageSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestionConfig" (
    "id" TEXT NOT NULL,
    "questionKey" "QuestionKey" NOT NULL,
    "version" INTEGER NOT NULL,
    "labelText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyQuestionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyOptionConfig" (
    "id" TEXT NOT NULL,
    "questionConfigId" TEXT NOT NULL,
    "optionKey" TEXT NOT NULL,
    "labelText" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "isExclusive" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SurveyOptionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyRespondent" (
    "id" TEXT NOT NULL,
    "fullName" TEXT,
    "phoneNormalizedHash" TEXT,
    "phoneLast4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyRespondent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyConsent" (
    "id" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL,
    "consentTextVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivacyConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySession" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "campaignId" TEXT,
    "source" "SessionSource" NOT NULL,
    "respondentId" TEXT,
    "staffUserId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "questionVersionSnapshot" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SurveySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyGroupChoice" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionKey" "GroupQuestionKey" NOT NULL,
    "productGroupId" TEXT,
    "isExclusiveChoice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SurveyGroupChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyChangeFactor" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "factorKey" "FactorKey" NOT NULL,

    CONSTRAINT "SurveyChangeFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyDetailChoice" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productGroupId" TEXT NOT NULL,
    "detailType" "DetailType" NOT NULL,
    "optionKey" TEXT NOT NULL,
    "brandId" TEXT,
    "packageSizeId" TEXT,
    "productTypeId" TEXT,
    "labelSnapshot" TEXT NOT NULL,

    CONSTRAINT "SurveyDetailChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "regionId" TEXT,
    "shopId" TEXT,
    "productGroupId" TEXT NOT NULL,
    "factorKey" "FactorKey" NOT NULL,
    "detailSummary" TEXT,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "requestRatio" DECIMAL(5,2),
    "priority" "ActionPriority" NOT NULL DEFAULT 'LOW',
    "status" "ActionStatus" NOT NULL DEFAULT 'UNASSESSED',
    "notes" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_code_key" ON "Region"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_code_key" ON "Shop"("code");

-- CreateIndex
CREATE INDEX "Shop_regionId_idx" ON "Shop"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_regionId_idx" ON "User"("regionId");

-- CreateIndex
CREATE INDEX "User_shopId_idx" ON "User"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopQrCode_token_key" ON "ShopQrCode"("token");

-- CreateIndex
CREATE INDEX "ShopQrCode_shopId_isActive_idx" ON "ShopQrCode"("shopId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductGroup_code_key" ON "ProductGroup"("code");

-- CreateIndex
CREATE INDEX "Brand_productGroupId_idx" ON "Brand"("productGroupId");

-- CreateIndex
CREATE INDEX "PackageSize_productGroupId_idx" ON "PackageSize"("productGroupId");

-- CreateIndex
CREATE INDEX "ProductType_productGroupId_idx" ON "ProductType"("productGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyQuestionConfig_questionKey_version_key" ON "SurveyQuestionConfig"("questionKey", "version");

-- CreateIndex
CREATE INDEX "SurveyOptionConfig_questionConfigId_idx" ON "SurveyOptionConfig"("questionConfigId");

-- CreateIndex
CREATE INDEX "SurveyRespondent_phoneNormalizedHash_idx" ON "SurveyRespondent"("phoneNormalizedHash");

-- CreateIndex
CREATE INDEX "SurveySession_shopId_campaignId_idx" ON "SurveySession"("shopId", "campaignId");

-- CreateIndex
CREATE INDEX "SurveySession_respondentId_idx" ON "SurveySession"("respondentId");

-- CreateIndex
CREATE INDEX "SurveySession_status_idx" ON "SurveySession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyGroupChoice_sessionId_questionKey_productGroupId_key" ON "SurveyGroupChoice"("sessionId", "questionKey", "productGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyChangeFactor_sessionId_productGroupId_factorKey_key" ON "SurveyChangeFactor"("sessionId", "productGroupId", "factorKey");

-- CreateIndex
CREATE INDEX "SurveyDetailChoice_sessionId_idx" ON "SurveyDetailChoice"("sessionId");

-- CreateIndex
CREATE INDEX "SurveyDetailChoice_productGroupId_detailType_idx" ON "SurveyDetailChoice"("productGroupId", "detailType");

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyCampaign" ADD CONSTRAINT "SurveyCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopQrCode" ADD CONSTRAINT "ShopQrCode_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopQrCode" ADD CONSTRAINT "ShopQrCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageSize" ADD CONSTRAINT "PackageSize_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductType" ADD CONSTRAINT "ProductType_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestionConfig" ADD CONSTRAINT "SurveyQuestionConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyOptionConfig" ADD CONSTRAINT "SurveyOptionConfig_questionConfigId_fkey" FOREIGN KEY ("questionConfigId") REFERENCES "SurveyQuestionConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyConsent" ADD CONSTRAINT "PrivacyConsent_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "SurveyRespondent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySession" ADD CONSTRAINT "SurveySession_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySession" ADD CONSTRAINT "SurveySession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SurveyCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySession" ADD CONSTRAINT "SurveySession_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "SurveyRespondent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySession" ADD CONSTRAINT "SurveySession_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyGroupChoice" ADD CONSTRAINT "SurveyGroupChoice_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SurveySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyGroupChoice" ADD CONSTRAINT "SurveyGroupChoice_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyChangeFactor" ADD CONSTRAINT "SurveyChangeFactor_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SurveySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyChangeFactor" ADD CONSTRAINT "SurveyChangeFactor_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDetailChoice" ADD CONSTRAINT "SurveyDetailChoice_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SurveySession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDetailChoice" ADD CONSTRAINT "SurveyDetailChoice_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDetailChoice" ADD CONSTRAINT "SurveyDetailChoice_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDetailChoice" ADD CONSTRAINT "SurveyDetailChoice_packageSizeId_fkey" FOREIGN KEY ("packageSizeId") REFERENCES "PackageSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDetailChoice" ADD CONSTRAINT "SurveyDetailChoice_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "ProductGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
