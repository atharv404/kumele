import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto, CreateAdDto, UpdateAdDto } from './dto';

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CAMPAIGNS ====================

  async createCampaign(ownerId: string, dto: CreateCampaignDto) {
    return this.prisma.adsCampaignV2.create({
      data: {
        ownerId,
        name: dto.name,
        dailyImpressionCap: dto.dailyImpressionCap,
        status: 'draft',
      },
    });
  }

  async updateCampaign(userId: string, campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.adsCampaignV2.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('You do not own this campaign');
    }

    return this.prisma.adsCampaignV2.update({
      where: { id: campaignId },
      data: dto,
    });
  }

  async listCampaigns(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      this.prisma.adsCampaignV2.findMany({
        where: { ownerId: userId },
        include: {
          _count: { select: { ads: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adsCampaignV2.count({ where: { ownerId: userId } }),
    ]);

    return {
      campaigns,
      total,
      page,
      limit,
      hasMore: skip + campaigns.length < total,
    };
  }

  async getCampaign(userId: string, campaignId: string) {
    const campaign = await this.prisma.adsCampaignV2.findUnique({
      where: { id: campaignId },
      include: {
        ads: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('You do not own this campaign');
    }

    return campaign;
  }

  // ==================== ADS ====================

  async createAd(userId: string, dto: CreateAdDto) {
    // Verify campaign ownership
    const campaign = await this.prisma.adsCampaignV2.findUnique({
      where: { id: dto.campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    if (campaign.ownerId !== userId) {
      throw new ForbiddenException('You do not own this campaign');
    }

    return this.prisma.adV2.create({
      data: {
        campaignId: dto.campaignId,
        title: dto.title,
        body: dto.body,
        mediaUrl: dto.mediaUrl,
        mediaType: dto.mediaType,
        destinationType: dto.destinationType,
        destinationId: dto.destinationId,
        destinationUrl: dto.destinationUrl,
        targetHobbies: dto.targetHobbies || [],
        targetLocations: dto.targetLocations || [],
        targetLanguages: dto.targetLanguages || [],
        targetAgeMin: dto.targetAgeMin,
        targetAgeMax: dto.targetAgeMax,
        targetGender: dto.targetGender,
        moderationStatus: 'pending_review',
      },
    });
  }

  async updateAd(userId: string, adId: string, dto: UpdateAdDto) {
    const ad = await this.prisma.adV2.findUnique({
      where: { id: adId },
      include: { campaign: true },
    });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.campaign.ownerId !== userId) {
      throw new ForbiddenException('You do not own this ad');
    }

    // Reset moderation if content changed
    const contentChanged = dto.title || dto.body || dto.mediaUrl;
    const updateData: any = { ...dto };
    
    if (contentChanged) {
      updateData.moderationStatus = 'pending_review';
      updateData.moderatedAt = null;
      updateData.moderatedBy = null;
    }

    return this.prisma.adV2.update({
      where: { id: adId },
      data: updateData,
    });
  }

  async getAd(userId: string, adId: string) {
    const ad = await this.prisma.adV2.findUnique({
      where: { id: adId },
      include: {
        campaign: true,
        dailyStats: {
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.campaign.ownerId !== userId) {
      throw new ForbiddenException('You do not own this ad');
    }

    return ad;
  }

  async deleteAd(userId: string, adId: string) {
    const ad = await this.prisma.adV2.findUnique({
      where: { id: adId },
      include: { campaign: true },
    });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    if (ad.campaign.ownerId !== userId) {
      throw new ForbiddenException('You do not own this ad');
    }

    await this.prisma.adV2.delete({ where: { id: adId } });
    return { message: 'Ad deleted successfully' };
  }
}
