-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED', 'FULL');

-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('REQUESTED', 'MATCHED', 'RESERVED', 'PENDING_PAYMENT', 'CONFIRMED', 'JOINED', 'EXPIRED', 'CANCELLED', 'ATTENDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYPAL', 'COINBASE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED', 'PAST_DUE', 'PAUSED', 'TRIALING');

-- CreateEnum
CREATE TYPE "ChatRoomStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BLOG', 'COMMENT', 'EVENT', 'USER_PROFILE', 'AD');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVENT_REMINDER', 'EVENT_CANCELED', 'EVENT_JOINED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'CHAT_MESSAGE', 'BADGE_EARNED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CheckinMethod" AS ENUM ('HOST_VERIFIED', 'SELF_VERIFIED');

-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('HOST_VERIFIED', 'SELF_VERIFIED', 'FAILED_DISTANCE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationRadius" INTEGER NOT NULL DEFAULT 10,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "referralCode" TEXT,
    "referredBy" TEXT,
    "googleId" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "currentBadge" "BadgeTier" NOT NULL DEFAULT 'NONE',
    "totalEventsAttended" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" BYTEA NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "deviceType" TEXT,
    "deviceName" TEXT,
    "transports" TEXT[],
    "aaguid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hobby_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hobby_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hobbies" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hobbies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_hobbies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hobbyId" TEXT NOT NULL,
    "skillLevel" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_hobbies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "address" TEXT,
    "displayAddress" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "venueName" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "eventStartTime" TIMESTAMP(3),
    "eventEndTime" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "capacity" INTEGER NOT NULL DEFAULT 10,
    "minCapacity" INTEGER NOT NULL DEFAULT 2,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "basePriceEur" DECIMAL(10,2),
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "currencyBase" TEXT NOT NULL DEFAULT 'EUR',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "genderRestriction" "Gender",
    "languagePreference" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_hobbies" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "hobbyId" TEXT NOT NULL,

    CONSTRAINT "event_hobbies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_joins" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JoinStatus" NOT NULL DEFAULT 'REQUESTED',
    "reservedUntil" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "matchScore" DOUBLE PRECISION,
    "matchDecision" TEXT,
    "matchedAt" TIMESTAMP(3),
    "matchingMode" TEXT NOT NULL DEFAULT 'auto',
    "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
    "paymentWindowStart" TIMESTAMP(3),
    "paymentExpiresAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "paymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_joins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkins" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" "CheckinMethod" NOT NULL,
    "status" "CheckinStatus" NOT NULL DEFAULT 'HOST_VERIFIED',
    "verifiedBy" TEXT,
    "guestLat" DOUBLE PRECISION,
    "guestLng" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "scannedByHostId" TEXT,
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "provider" "PaymentProvider" NOT NULL,
    "providerIntentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "capturedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "promoCodeId" TEXT,
    "discountAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1,
    "minPurchase" DECIMAL(10,2),
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerSubId" TEXT NOT NULL,
    "providerCustomerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "ChatRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "closesAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "chatRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImage" TEXT,
    "coverImageUrl" TEXT,
    "hobbyCategoryId" TEXT,
    "language" TEXT,
    "eventId" TEXT,
    "moderation" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "moderation" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "targetUrl" TEXT NOT NULL,
    "targeting" JSONB NOT NULL,
    "dailyBudget" DECIMAL(10,2) NOT NULL,
    "totalBudget" DECIMAL(10,2),
    "spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_metrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spent" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ad_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_jobs" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING',
    "decision" TEXT,
    "reason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_connections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nft_ownerships" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "name" TEXT,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nft_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_references" (
    "id" TEXT NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badge" "BadgeTier" NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localizations" (
    "id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_referralCode_idx" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_latitude_longitude_idx" ON "users"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_refreshToken_idx" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentials_credentialId_key" ON "passkey_credentials"("credentialId");

-- CreateIndex
CREATE INDEX "passkey_credentials_userId_idx" ON "passkey_credentials"("userId");

-- CreateIndex
CREATE INDEX "passkey_credentials_credentialId_idx" ON "passkey_credentials"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "hobby_categories_name_key" ON "hobby_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hobby_categories_slug_key" ON "hobby_categories"("slug");

-- CreateIndex
CREATE INDEX "hobby_categories_slug_idx" ON "hobby_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hobbies_slug_key" ON "hobbies"("slug");

-- CreateIndex
CREATE INDEX "hobbies_slug_idx" ON "hobbies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hobbies_categoryId_name_key" ON "hobbies"("categoryId", "name");

-- CreateIndex
CREATE INDEX "user_hobbies_userId_idx" ON "user_hobbies"("userId");

-- CreateIndex
CREATE INDEX "user_hobbies_hobbyId_idx" ON "user_hobbies"("hobbyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_hobbies_userId_hobbyId_key" ON "user_hobbies"("userId", "hobbyId");

-- CreateIndex
CREATE INDEX "events_hostId_idx" ON "events"("hostId");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "events_startsAt_idx" ON "events"("startsAt");

-- CreateIndex
CREATE INDEX "events_latitude_longitude_idx" ON "events"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "events_city_idx" ON "events"("city");

-- CreateIndex
CREATE INDEX "event_hobbies_eventId_idx" ON "event_hobbies"("eventId");

-- CreateIndex
CREATE INDEX "event_hobbies_hobbyId_idx" ON "event_hobbies"("hobbyId");

-- CreateIndex
CREATE UNIQUE INDEX "event_hobbies_eventId_hobbyId_key" ON "event_hobbies"("eventId", "hobbyId");

-- CreateIndex
CREATE INDEX "event_joins_eventId_idx" ON "event_joins"("eventId");

-- CreateIndex
CREATE INDEX "event_joins_userId_idx" ON "event_joins"("userId");

-- CreateIndex
CREATE INDEX "event_joins_status_idx" ON "event_joins"("status");

-- CreateIndex
CREATE INDEX "event_joins_reservedUntil_idx" ON "event_joins"("reservedUntil");

-- CreateIndex
CREATE INDEX "event_joins_paymentExpiresAt_idx" ON "event_joins"("paymentExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_joins_eventId_userId_key" ON "event_joins"("eventId", "userId");

-- CreateIndex
CREATE INDEX "checkins_eventId_idx" ON "checkins"("eventId");

-- CreateIndex
CREATE INDEX "checkins_userId_idx" ON "checkins"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "checkins_eventId_userId_key" ON "checkins"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_providerIntentId_key" ON "payment_intents"("providerIntentId");

-- CreateIndex
CREATE INDEX "payment_intents_userId_idx" ON "payment_intents"("userId");

-- CreateIndex
CREATE INDEX "payment_intents_eventId_idx" ON "payment_intents"("eventId");

-- CreateIndex
CREATE INDEX "payment_intents_providerIntentId_idx" ON "payment_intents"("providerIntentId");

-- CreateIndex
CREATE INDEX "payment_intents_status_idx" ON "payment_intents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "promo_codes_code_key" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_code_idx" ON "promo_codes"("code");

-- CreateIndex
CREATE INDEX "promo_codes_isActive_idx" ON "promo_codes"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_providerSubId_key" ON "subscriptions"("providerSubId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_providerSubId_idx" ON "subscriptions"("providerSubId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "chat_rooms_eventId_key" ON "chat_rooms"("eventId");

-- CreateIndex
CREATE INDEX "chat_rooms_eventId_idx" ON "chat_rooms"("eventId");

-- CreateIndex
CREATE INDEX "chat_rooms_status_idx" ON "chat_rooms"("status");

-- CreateIndex
CREATE INDEX "chat_rooms_closesAt_idx" ON "chat_rooms"("closesAt");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_idx" ON "chat_messages"("chatRoomId");

-- CreateIndex
CREATE INDEX "chat_messages_userId_idx" ON "chat_messages"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_authorId_idx" ON "blog_posts"("authorId");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_moderation_idx" ON "blog_posts"("moderation");

-- CreateIndex
CREATE INDEX "blog_posts_hobbyCategoryId_idx" ON "blog_posts"("hobbyCategoryId");

-- CreateIndex
CREATE INDEX "blog_posts_isPublished_idx" ON "blog_posts"("isPublished");

-- CreateIndex
CREATE INDEX "blog_posts_createdAt_idx" ON "blog_posts"("createdAt");

-- CreateIndex
CREATE INDEX "blog_comments_postId_idx" ON "blog_comments"("postId");

-- CreateIndex
CREATE INDEX "blog_comments_authorId_idx" ON "blog_comments"("authorId");

-- CreateIndex
CREATE INDEX "blog_comments_parentId_idx" ON "blog_comments"("parentId");

-- CreateIndex
CREATE INDEX "blog_likes_postId_idx" ON "blog_likes"("postId");

-- CreateIndex
CREATE INDEX "blog_likes_userId_idx" ON "blog_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "blog_likes_postId_userId_key" ON "blog_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "ad_accounts_userId_idx" ON "ad_accounts"("userId");

-- CreateIndex
CREATE INDEX "ad_campaigns_accountId_idx" ON "ad_campaigns"("accountId");

-- CreateIndex
CREATE INDEX "ad_campaigns_status_idx" ON "ad_campaigns"("status");

-- CreateIndex
CREATE INDEX "ad_campaigns_startsAt_idx" ON "ad_campaigns"("startsAt");

-- CreateIndex
CREATE INDEX "ad_metrics_campaignId_idx" ON "ad_metrics"("campaignId");

-- CreateIndex
CREATE INDEX "ad_metrics_date_idx" ON "ad_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_metrics_campaignId_date_key" ON "ad_metrics"("campaignId", "date");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_userId_idx" ON "push_tokens"("userId");

-- CreateIndex
CREATE INDEX "push_tokens_token_idx" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_tickets_createdAt_idx" ON "support_tickets"("createdAt");

-- CreateIndex
CREATE INDEX "content_reports_reporterId_idx" ON "content_reports"("reporterId");

-- CreateIndex
CREATE INDEX "content_reports_contentType_contentId_idx" ON "content_reports"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "content_reports_status_idx" ON "content_reports"("status");

-- CreateIndex
CREATE INDEX "moderation_jobs_contentType_contentId_idx" ON "moderation_jobs"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "moderation_jobs_status_idx" ON "moderation_jobs"("status");

-- CreateIndex
CREATE INDEX "wallet_connections_userId_idx" ON "wallet_connections"("userId");

-- CreateIndex
CREATE INDEX "wallet_connections_walletAddress_idx" ON "wallet_connections"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_connections_userId_walletAddress_key" ON "wallet_connections"("userId", "walletAddress");

-- CreateIndex
CREATE INDEX "nft_ownerships_walletAddress_idx" ON "nft_ownerships"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "nft_ownerships_walletAddress_contractAddress_tokenId_chainI_key" ON "nft_ownerships"("walletAddress", "contractAddress", "tokenId", "chainId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_references_transactionHash_key" ON "transaction_references"("transactionHash");

-- CreateIndex
CREATE INDEX "transaction_references_transactionHash_idx" ON "transaction_references"("transactionHash");

-- CreateIndex
CREATE INDEX "transaction_references_referenceId_idx" ON "transaction_references"("referenceId");

-- CreateIndex
CREATE INDEX "reward_history_userId_idx" ON "reward_history"("userId");

-- CreateIndex
CREATE INDEX "reward_history_earnedAt_idx" ON "reward_history"("earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "app_configs_key_key" ON "app_configs"("key");

-- CreateIndex
CREATE INDEX "app_configs_key_idx" ON "app_configs"("key");

-- CreateIndex
CREATE INDEX "localizations_language_idx" ON "localizations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "localizations_language_key_key" ON "localizations"("language", "key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hobbies" ADD CONSTRAINT "hobbies_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "hobby_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hobbies" ADD CONSTRAINT "user_hobbies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_hobbies" ADD CONSTRAINT "user_hobbies_hobbyId_fkey" FOREIGN KEY ("hobbyId") REFERENCES "hobbies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_hobbies" ADD CONSTRAINT "event_hobbies_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_hobbies" ADD CONSTRAINT "event_hobbies_hobbyId_fkey" FOREIGN KEY ("hobbyId") REFERENCES "hobbies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_joins" ADD CONSTRAINT "event_joins_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_joins" ADD CONSTRAINT "event_joins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_hobbyCategoryId_fkey" FOREIGN KEY ("hobbyCategoryId") REFERENCES "hobby_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "blog_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_likes" ADD CONSTRAINT "blog_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_likes" ADD CONSTRAINT "blog_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ad_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_metrics" ADD CONSTRAINT "ad_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ad_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_connections" ADD CONSTRAINT "wallet_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_history" ADD CONSTRAINT "reward_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
