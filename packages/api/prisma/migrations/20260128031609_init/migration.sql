-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ANALYST', 'RESPONDER', 'VIEWER');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('NGO', 'GOVERNMENT', 'UN_AGENCY', 'PRIVATE', 'RESEARCH');

-- CreateEnum
CREATE TYPE "CrisisType" AS ENUM ('NATURAL_DISASTER', 'CONFLICT', 'DISEASE_OUTBREAK', 'FOOD_SECURITY', 'DISPLACEMENT', 'INFRASTRUCTURE', 'ECONOMIC', 'ENVIRONMENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CrisisStatus" AS ENUM ('EMERGING', 'DEVELOPING', 'ONGOING', 'STABILIZING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('NEWS', 'SOCIAL_MEDIA', 'GOVERNMENT', 'UN_REPORT', 'NGO_REPORT', 'SATELLITE', 'SENSOR', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('NEW_CRISIS', 'SEVERITY_CHANGE', 'STATUS_CHANGE', 'SUMMARY_READY', 'THRESHOLD_BREACH');

-- CreateEnum
CREATE TYPE "SummaryType" AS ENUM ('SITUATION', 'TIMELINE', 'IMPACT', 'RESPONSE', 'BRIEFING');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('MARKDOWN', 'PDF', 'HTML');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Crisis" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CrisisType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "CrisisStatus" NOT NULL DEFAULT 'EMERGING',
    "confidence" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "country" TEXT,
    "region" TEXT,
    "location" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Crisis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "location" TEXT,
    "sentiment" DOUBLE PRECISION,
    "relevance" DOUBLE PRECISION,
    "entities" JSONB,
    "crisisId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "url" TEXT,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFetched" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "crisisId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "crisisTypes" "CrisisType"[],
    "minSeverity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "regions" TEXT[],
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchRegion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "countries" TEXT[],
    "boundingBox" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "SummaryType" NOT NULL,
    "crisisId" TEXT NOT NULL,
    "model" TEXT,
    "tokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'MARKDOWN',
    "crisisId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CrisisToDataSource" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "Crisis_type_idx" ON "Crisis"("type");

-- CreateIndex
CREATE INDEX "Crisis_severity_idx" ON "Crisis"("severity");

-- CreateIndex
CREATE INDEX "Crisis_status_idx" ON "Crisis"("status");

-- CreateIndex
CREATE INDEX "Crisis_country_idx" ON "Crisis"("country");

-- CreateIndex
CREATE INDEX "Crisis_detectedAt_idx" ON "Crisis"("detectedAt");

-- CreateIndex
CREATE INDEX "Event_crisisId_idx" ON "Event"("crisisId");

-- CreateIndex
CREATE INDEX "Event_publishedAt_idx" ON "Event"("publishedAt");

-- CreateIndex
CREATE INDEX "Event_sourceType_idx" ON "Event"("sourceType");

-- CreateIndex
CREATE INDEX "Alert_userId_isRead_idx" ON "Alert"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Alert_crisisId_idx" ON "Alert"("crisisId");

-- CreateIndex
CREATE INDEX "AlertConfig_organizationId_idx" ON "AlertConfig"("organizationId");

-- CreateIndex
CREATE INDEX "WatchRegion_organizationId_idx" ON "WatchRegion"("organizationId");

-- CreateIndex
CREATE INDEX "Summary_crisisId_idx" ON "Summary"("crisisId");

-- CreateIndex
CREATE INDEX "Report_crisisId_idx" ON "Report"("crisisId");

-- CreateIndex
CREATE INDEX "Report_authorId_idx" ON "Report"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "_CrisisToDataSource_AB_unique" ON "_CrisisToDataSource"("A", "B");

-- CreateIndex
CREATE INDEX "_CrisisToDataSource_B_index" ON "_CrisisToDataSource"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_crisisId_fkey" FOREIGN KEY ("crisisId") REFERENCES "Crisis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_crisisId_fkey" FOREIGN KEY ("crisisId") REFERENCES "Crisis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertConfig" ADD CONSTRAINT "AlertConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchRegion" ADD CONSTRAINT "WatchRegion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_crisisId_fkey" FOREIGN KEY ("crisisId") REFERENCES "Crisis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_crisisId_fkey" FOREIGN KEY ("crisisId") REFERENCES "Crisis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrisisToDataSource" ADD CONSTRAINT "_CrisisToDataSource_A_fkey" FOREIGN KEY ("A") REFERENCES "Crisis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CrisisToDataSource" ADD CONSTRAINT "_CrisisToDataSource_B_fkey" FOREIGN KEY ("B") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
