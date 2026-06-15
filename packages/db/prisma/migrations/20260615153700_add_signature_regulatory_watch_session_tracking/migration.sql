-- CreateEnum
CREATE TYPE "RegulatoryWatchTheme" AS ENUM ('INDIC_23', 'INDIC_24', 'INDIC_25', 'INDIC_26');

-- CreateEnum
CREATE TYPE "RegulatoryWatchStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RegulatoryWatchSource" AS ENUM ('USER', 'IMPORT', 'AUTO');

-- AlterEnum
ALTER TYPE "DocType" ADD VALUE 'VEILLE_AUDIT';

-- AlterTable
ALTER TABLE "PreEnrollment" ADD COLUMN     "signatureHash" TEXT,
ADD COLUMN     "signatureIp" TEXT,
ADD COLUMN     "signatureKey" TEXT,
ADD COLUMN     "signatureSignedAt" TIMESTAMP(3),
ADD COLUMN     "signatureUserAgent" TEXT;

-- AlterTable
ALTER TABLE "SessionParticipant" ADD COLUMN     "factureEnvoyee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paiementClient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remboursementOpco" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "validationOpco" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RegulatoryWatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "theme" "RegulatoryWatchTheme" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT,
    "modeSuivi" TEXT,
    "typeSource" TEXT,
    "responsable" TEXT,
    "frequency" TEXT,
    "exploitation" TEXT,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateLastReviewed" TIMESTAMP(3),
    "status" "RegulatoryWatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "suggestedBy" "RegulatoryWatchSource" NOT NULL DEFAULT 'USER',
    "rssSourceUrl" TEXT,
    "rawSnippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegulatoryWatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegulatoryWatch_tenantId_theme_status_idx" ON "RegulatoryWatch"("tenantId", "theme", "status");

-- CreateIndex
CREATE INDEX "RegulatoryWatch_tenantId_status_suggestedBy_idx" ON "RegulatoryWatch"("tenantId", "status", "suggestedBy");

-- CreateIndex
CREATE INDEX "RegulatoryWatch_tenantId_dateLastReviewed_idx" ON "RegulatoryWatch"("tenantId", "dateLastReviewed");

-- AddForeignKey
ALTER TABLE "RegulatoryWatch" ADD CONSTRAINT "RegulatoryWatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

