-- CreateEnum
CREATE TYPE "NotificationFreq" AS ENUM ('IMMEDIATE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "AlertSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "regions" TEXT[],
    "crisisTypes" "CrisisType"[],
    "minSeverity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "frequency" "NotificationFreq" NOT NULL DEFAULT 'IMMEDIATE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "unsubscribeToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentNotification" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "crisisId" TEXT,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlertSubscription_verificationToken_key" ON "AlertSubscription"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "AlertSubscription_unsubscribeToken_key" ON "AlertSubscription"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "AlertSubscription_email_idx" ON "AlertSubscription"("email");

-- CreateIndex
CREATE INDEX "AlertSubscription_isActive_idx" ON "AlertSubscription"("isActive");

-- CreateIndex
CREATE INDEX "AlertSubscription_regions_idx" ON "AlertSubscription"("regions");

-- CreateIndex
CREATE INDEX "SentNotification_subscriptionId_idx" ON "SentNotification"("subscriptionId");

-- CreateIndex
CREATE INDEX "SentNotification_status_idx" ON "SentNotification"("status");

-- AddForeignKey
ALTER TABLE "SentNotification" ADD CONSTRAINT "SentNotification_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "AlertSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
