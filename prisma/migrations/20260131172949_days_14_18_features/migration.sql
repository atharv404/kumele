/*
  Warnings:

  - A unique constraint covering the columns `[stripeId]` on the table `payment_intents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'SCHEDULED', 'RELEASED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- AlterEnum
ALTER TYPE "ChatRoomStatus" ADD VALUE 'DELETED';

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "chat_rooms" ADD COLUMN     "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "event_joins" ADD COLUMN     "matchFinalizedAt" TIMESTAMP(3),
ADD COLUMN     "matchFinalizedBy" TEXT,
ADD COLUMN     "paymentCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "payment_intents" ADD COLUMN     "amountMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "discountAmountMinor" INTEGER,
ADD COLUMN     "discountCodeId" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "originalAmountMinor" INTEGER,
ADD COLUMN     "productType" TEXT NOT NULL DEFAULT 'EVENT',
ADD COLUMN     "rewardDiscountId" TEXT,
ADD COLUMN     "stripeId" TEXT,
ALTER COLUMN "provider" SET DEFAULT 'STRIPE',
ALTER COLUMN "providerIntentId" DROP NOT NULL,
ALTER COLUMN "currency" SET DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "entitlements" JSONB,
ALTER COLUMN "providerCustomerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeConnectedAccountId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT;

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrows" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeTransferId" TEXT,
    "attendanceVerified" BOOLEAN NOT NULL DEFAULT false,
    "eventEndAt" TIMESTAMP(3) NOT NULL,
    "releaseAt" TIMESTAMP(3) NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "base" TEXT NOT NULL,
    "rates" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "productTypes" TEXT[],
    "minAmount" INTEGER,
    "maxUses" INTEGER,
    "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
    "allowedCountries" TEXT[],
    "allowedCities" TEXT[],
    "userSegments" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_redemptions" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_discounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardTier" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_v2" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "deviceId" TEXT,
    "language" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_delivery_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "followerUserId" TEXT NOT NULL,
    "followedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("followerUserId","followedUserId")
);

-- CreateTable
CREATE TABLE "ads_campaigns_v2" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dailyImpressionCap" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_campaigns_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads_v2" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL,
    "destinationId" TEXT,
    "destinationUrl" TEXT,
    "targetHobbies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetAgeMin" INTEGER,
    "targetAgeMax" INTEGER,
    "targetGender" TEXT,
    "moderationStatus" TEXT NOT NULL DEFAULT 'pending_review',
    "moderationReasonCode" TEXT,
    "moderationReasonText" TEXT,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ads_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_events_v2" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "impressionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "placement" TEXT,
    "hobbyContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_events_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_daily_stats" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admob_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admob_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reasonCode" TEXT,
    "reasonText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localization_strings" (
    "id" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "namespace" TEXT NOT NULL DEFAULT 'ui',
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localization_strings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdBy" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "entityId" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets_v2" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "relatedEntityId" TEXT,
    "relatedEntityType" TEXT,
    "assignedToId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_v2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "refund_requests_paymentIntentId_idx" ON "refund_requests"("paymentIntentId");

-- CreateIndex
CREATE INDEX "refund_requests_userId_idx" ON "refund_requests"("userId");

-- CreateIndex
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_paymentIntentId_key" ON "escrows"("paymentIntentId");

-- CreateIndex
CREATE INDEX "escrows_status_idx" ON "escrows"("status");

-- CreateIndex
CREATE INDEX "escrows_releaseAt_idx" ON "escrows"("releaseAt");

-- CreateIndex
CREATE INDEX "escrows_hostId_idx" ON "escrows"("hostId");

-- CreateIndex
CREATE INDEX "escrows_eventId_idx" ON "escrows"("eventId");

-- CreateIndex
CREATE INDEX "fx_rates_date_idx" ON "fx_rates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_date_base_key" ON "fx_rates"("date", "base");

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_key" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_code_idx" ON "discount_codes"("code");

-- CreateIndex
CREATE INDEX "discount_codes_isActive_validFrom_validUntil_idx" ON "discount_codes"("isActive", "validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "discount_redemptions_userId_codeId_idx" ON "discount_redemptions"("userId", "codeId");

-- CreateIndex
CREATE INDEX "reward_discounts_userId_isRedeemed_idx" ON "reward_discounts"("userId", "isRedeemed");

-- CreateIndex
CREATE INDEX "notifications_v2_userId_createdAt_idx" ON "notifications_v2"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_v2_userId_isRead_idx" ON "notifications_v2"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notification_tokens_userId_idx" ON "notification_tokens"("userId");

-- CreateIndex
CREATE INDEX "notification_tokens_isActive_idx" ON "notification_tokens"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "notification_tokens_userId_fcmToken_key" ON "notification_tokens"("userId", "fcmToken");

-- CreateIndex
CREATE INDEX "email_delivery_logs_userId_idx" ON "email_delivery_logs"("userId");

-- CreateIndex
CREATE INDEX "email_delivery_logs_status_idx" ON "email_delivery_logs"("status");

-- CreateIndex
CREATE INDEX "follows_followedUserId_idx" ON "follows"("followedUserId");

-- CreateIndex
CREATE INDEX "follows_followerUserId_idx" ON "follows"("followerUserId");

-- CreateIndex
CREATE INDEX "ads_campaigns_v2_ownerId_idx" ON "ads_campaigns_v2"("ownerId");

-- CreateIndex
CREATE INDEX "ads_campaigns_v2_status_idx" ON "ads_campaigns_v2"("status");

-- CreateIndex
CREATE INDEX "ads_v2_campaignId_idx" ON "ads_v2"("campaignId");

-- CreateIndex
CREATE INDEX "ads_v2_moderationStatus_idx" ON "ads_v2"("moderationStatus");

-- CreateIndex
CREATE INDEX "ad_events_v2_adId_idx" ON "ad_events_v2"("adId");

-- CreateIndex
CREATE INDEX "ad_events_v2_userId_idx" ON "ad_events_v2"("userId");

-- CreateIndex
CREATE INDEX "ad_events_v2_createdAt_idx" ON "ad_events_v2"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ad_events_v2_userId_adId_eventType_impressionId_key" ON "ad_events_v2"("userId", "adId", "eventType", "impressionId");

-- CreateIndex
CREATE INDEX "ad_daily_stats_campaignId_idx" ON "ad_daily_stats"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "ad_daily_stats_adId_date_key" ON "ad_daily_stats"("adId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "admob_configs_key_key" ON "admob_configs"("key");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminUserId_createdAt_idx" ON "admin_audit_logs"("adminUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_logs_entityType_entityId_createdAt_idx" ON "admin_audit_logs"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "localization_strings_lang_version_idx" ON "localization_strings"("lang", "version");

-- CreateIndex
CREATE UNIQUE INDEX "localization_strings_lang_namespace_key_version_key" ON "localization_strings"("lang", "namespace", "key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "share_tokens_token_key" ON "share_tokens"("token");

-- CreateIndex
CREATE INDEX "share_tokens_token_idx" ON "share_tokens"("token");

-- CreateIndex
CREATE INDEX "share_tokens_entityType_entityId_idx" ON "share_tokens"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "media_assets_uploadedBy_idx" ON "media_assets"("uploadedBy");

-- CreateIndex
CREATE INDEX "media_assets_mediaType_entityId_idx" ON "media_assets"("mediaType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_v2_ticketNumber_key" ON "support_tickets_v2"("ticketNumber");

-- CreateIndex
CREATE INDEX "support_tickets_v2_status_createdAt_idx" ON "support_tickets_v2"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "support_tickets_v2_category_createdAt_idx" ON "support_tickets_v2"("category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "support_tickets_v2_userId_createdAt_idx" ON "support_tickets_v2"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "support_tickets_v2_priority_createdAt_idx" ON "support_tickets_v2"("priority", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "support_tickets_v2_assignedToId_idx" ON "support_tickets_v2"("assignedToId");

-- CreateIndex
CREATE INDEX "support_ticket_attachments_ticketId_idx" ON "support_ticket_attachments"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_stripeId_key" ON "payment_intents"("stripeId");

-- CreateIndex
CREATE INDEX "payment_intents_stripeId_idx" ON "payment_intents"("stripeId");

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrows" ADD CONSTRAINT "escrows_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "discount_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_discounts" ADD CONSTRAINT "reward_discounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_v2" ADD CONSTRAINT "notifications_v2_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_tokens" ADD CONSTRAINT "notification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerUserId_fkey" FOREIGN KEY ("followerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followedUserId_fkey" FOREIGN KEY ("followedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads_campaigns_v2" ADD CONSTRAINT "ads_campaigns_v2_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads_v2" ADD CONSTRAINT "ads_v2_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ads_campaigns_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads_v2" ADD CONSTRAINT "ads_v2_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_events_v2" ADD CONSTRAINT "ad_events_v2_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_events_v2" ADD CONSTRAINT "ad_events_v2_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_daily_stats" ADD CONSTRAINT "ad_daily_stats_adId_fkey" FOREIGN KEY ("adId") REFERENCES "ads_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_tokens" ADD CONSTRAINT "share_tokens_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets_v2" ADD CONSTRAINT "support_tickets_v2_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets_v2" ADD CONSTRAINT "support_tickets_v2_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
