import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationCapsService } from '../notifications/notification-caps.service';
import { FetchAdsDto, AdFetchResponseDto } from './dto';

@Injectable()
export class AdsServingService {
  private readonly logger = new Logger(AdsServingService.name);
  private readonly mlServiceUrl: string;
  private readonly mlTimeout: number = 300; // 300ms timeout for ML service

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly capsService: NotificationCapsService,
  ) {
    this.mlServiceUrl = this.configService.get('ML_SERVICE_URL', '');
  }

  /**
   * Fetch ads with ML-first, SQL-fallback, AdMob-last strategy
   */
  async fetchAds(userId: string, dto: FetchAdsDto): Promise<AdFetchResponseDto> {
    const { placement, locationKey, lang, hobbyContext, limit = 1 } = dto;

    // 1. Try ML service first (time-boxed)
    if (this.mlServiceUrl) {
      try {
        const mlAd = await this.fetchFromML(userId, dto);
        if (mlAd) {
          return {
            placement,
            ad_source: 'ML',
            strict: true,
            first_party_ad: mlAd,
            admob_context: null,
          };
        }
      } catch (error) {
        this.logger.warn(`ML service failed, falling back to SQL: ${error.message}`);
      }
    }

    // 2. SQL fallback (deterministic)
    const sqlAd = await this.fetchFromSQL(userId, locationKey, lang, hobbyContext);
    if (sqlAd) {
      return {
        placement,
        ad_source: 'BACKEND',
        strict: true,
        first_party_ad: sqlAd,
        admob_context: null,
      };
    }

    // 3. AdMob fallback (if enabled and no first-party ads)
    const adMobEnabled = await this.isAdMobEnabled();
    if (adMobEnabled) {
      const adMobContext = await this.getAdMobContext(placement, locationKey);
      return {
        placement,
        ad_source: 'ADMOB',
        strict: false,
        first_party_ad: null,
        admob_context: adMobContext,
      };
    }

    // 4. No ads available
    return {
      placement,
      ad_source: 'NONE',
      strict: false,
      first_party_ad: null,
      admob_context: null,
    };
  }

  /**
   * Track ad event (view/click/conversion)
   */
  async trackEvent(
    userId: string,
    adId: string,
    campaignId: string,
    impressionId: string,
    eventType: string,
    placement?: string,
    hobbyContext?: string,
  ): Promise<void> {
    try {
      // Idempotent upsert
      await this.prisma.adEventV2.upsert({
        where: {
          userId_adId_eventType_impressionId: {
            userId,
            adId,
            eventType,
            impressionId,
          },
        },
        update: {},
        create: {
          userId,
          adId,
          campaignId,
          impressionId,
          eventType,
          placement,
          hobbyContext,
        },
      });

      // Update daily stats
      await this.updateDailyStats(adId, campaignId, eventType);
    } catch (error) {
      this.logger.error(`Failed to track ad event: ${error.message}`);
      // Don't throw - tracking should never block
    }
  }

  /**
   * Get AdMob context for fallback
   */
  async getAdMobContext(placement: string, locationKey?: string): Promise<Record<string, any>> {
    const config = await this.prisma.adMobConfig.findFirst({
      where: { key: 'default' },
    });

    const configValue = (config?.value || {}) as Record<string, any>;

    return {
      enabled: true,
      placement,
      location: locationKey,
      unitId: configValue['unitId'] || 'ca-app-pub-xxxxx/xxxxx',
      ...configValue,
    };
  }

  // ==================== PRIVATE METHODS ====================

  private async fetchFromML(userId: string, dto: FetchAdsDto): Promise<any | null> {
    // In production, this would call the ML service
    // For now, we return null to fall back to SQL
    return null;
  }

  private async fetchFromSQL(
    userId: string,
    locationKey?: string,
    lang?: string,
    hobbyContext?: string,
  ): Promise<any | null> {
    // Get user info for targeting
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        city: true,
        country: true,
        preferredLanguage: true,
        dateOfBirth: true,
        gender: true,
        hobbies: { select: { hobby: { select: { slug: true } } } },
      },
    });

    if (!user) return null;

    // Calculate user age
    const userAge = user.dateOfBirth
      ? Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    const userLocation = locationKey || (user.city && user.country ? `${user.city}_${user.country}` : null);
    const userLang = lang || user.preferredLanguage || 'en';
    const userHobbies = user.hobbies.map((h) => h.hobby.slug);

    // Find eligible ads with deterministic ranking by CTR
    const ads = await this.prisma.$queryRaw<any[]>`
      SELECT 
        a.*,
        COALESCE(
          (SELECT clicks::float / NULLIF(impressions, 0) 
           FROM ad_daily_stats 
           WHERE "adId" = a.id 
             AND date >= CURRENT_DATE - INTERVAL '7 days'
           ORDER BY date DESC
           LIMIT 1
          ), 0
        ) as ctr,
        (SELECT COALESCE(SUM(impressions), 0) 
         FROM ad_daily_stats 
         WHERE "adId" = a.id 
           AND date >= CURRENT_DATE - INTERVAL '7 days'
        ) as recent_impressions
      FROM ads_v2 a
      JOIN ads_campaigns_v2 c ON a."campaignId" = c.id
      WHERE a."moderationStatus" = 'approved'
        AND c.status = 'active'
        AND (
          a."targetLanguages" = '{}'::text[] 
          OR ${userLang} = ANY(a."targetLanguages")
        )
        AND (
          a."targetAgeMin" IS NULL 
          OR ${userAge || 0} >= a."targetAgeMin"
        )
        AND (
          a."targetAgeMax" IS NULL 
          OR ${userAge || 100} <= a."targetAgeMax"
        )
      ORDER BY 
        CASE WHEN recent_impressions >= 50 THEN ctr ELSE 0 END DESC,
        a."createdAt" DESC
      LIMIT 10
    `;

    // Filter by frequency caps
    for (const ad of ads) {
      const canShow = await this.capsService.canShowAdToUser(userId, ad.id);
      const canRepeat = await this.capsService.canRepeatAd(userId, ad.id);
      const canShowAdvertiser = await this.capsService.canShowAdvertiserToUser(userId, ad.campaignId);

      if (canShow && canRepeat && canShowAdvertiser) {
        return {
          id: ad.id,
          campaignId: ad.campaignId,
          title: ad.title,
          body: ad.body,
          mediaUrl: ad.mediaUrl,
          mediaType: ad.mediaType,
          destinationType: ad.destinationType,
          destinationId: ad.destinationId,
          destinationUrl: ad.destinationUrl,
        };
      }
    }

    return null;
  }

  private async isAdMobEnabled(): Promise<boolean> {
    const config = await this.prisma.appConfig.findUnique({
      where: { key: 'feature_flags' },
    });
    const configValue = (config?.value || {}) as Record<string, any>;
    return configValue['admob_enabled'] ?? false;
  }

  private async updateDailyStats(adId: string, campaignId: string, eventType: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const incrementField = eventType === 'view' ? 'impressions' : eventType === 'click' ? 'clicks' : 'conversions';

    await this.prisma.adDailyStat.upsert({
      where: {
        adId_date: { adId, date: today },
      },
      update: {
        [incrementField]: { increment: 1 },
      },
      create: {
        adId,
        campaignId,
        date: today,
        [incrementField]: 1,
      },
    });

    // Update CTR and conversion rate
    await this.prisma.$executeRaw`
      UPDATE ad_daily_stats
      SET 
        ctr = CASE WHEN impressions > 0 THEN clicks::float / impressions ELSE 0 END,
        "conversionRate" = CASE WHEN clicks > 0 THEN conversions::float / clicks ELSE 0 END
      WHERE "adId" = ${adId} AND date = ${today}
    `;
  }
}
