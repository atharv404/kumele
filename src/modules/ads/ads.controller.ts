import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdsService } from './ads.service';
import { AdsServingService } from './ads-serving.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateAdDto,
  UpdateAdDto,
  FetchAdsDto,
  TrackAdDto,
  CampaignResponseDto,
  AdResponseDto,
  AdFetchResponseDto,
} from './dto';

@ApiTags('Ads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ads')
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly servingService: AdsServingService,
  ) {}

  // ==================== CAMPAIGNS ====================

  @Post('campaigns')
  @ApiOperation({ summary: 'Create a new ad campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created', type: CampaignResponseDto })
  async createCampaign(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return this.adsService.createCampaign(userId, dto);
  }

  @Put('campaigns/:id')
  @ApiOperation({ summary: 'Update an ad campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated', type: CampaignResponseDto })
  async updateCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') campaignId: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.adsService.updateCampaign(userId, campaignId, dto);
  }

  @Get('campaigns')
  @ApiOperation({ summary: 'List my ad campaigns' })
  async listCampaigns(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adsService.listCampaigns(userId, page, limit);
  }

  @Get('campaigns/:id')
  @ApiOperation({ summary: 'Get campaign details with ads' })
  async getCampaign(
    @CurrentUser('id') userId: string,
    @Param('id') campaignId: string,
  ) {
    return this.adsService.getCampaign(userId, campaignId);
  }

  // ==================== ADS ====================

  @Post()
  @ApiOperation({ summary: 'Create a new ad (triggers moderation)' })
  @ApiResponse({ status: 201, description: 'Ad created', type: AdResponseDto })
  async createAd(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAdDto,
  ) {
    return this.adsService.createAd(userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an ad' })
  @ApiResponse({ status: 200, description: 'Ad updated', type: AdResponseDto })
  async updateAd(
    @CurrentUser('id') userId: string,
    @Param('id') adId: string,
    @Body() dto: UpdateAdDto,
  ) {
    return this.adsService.updateAd(userId, adId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ad details with stats' })
  async getAd(
    @CurrentUser('id') userId: string,
    @Param('id') adId: string,
  ) {
    return this.adsService.getAd(userId, adId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an ad' })
  async deleteAd(
    @CurrentUser('id') userId: string,
    @Param('id') adId: string,
  ) {
    return this.adsService.deleteAd(userId, adId);
  }

  // ==================== AD SERVING ====================

  @Get('fetch')
  @ApiOperation({ summary: 'Fetch ads for display (ML + fallback)' })
  @ApiResponse({ status: 200, description: 'Ads response', type: AdFetchResponseDto })
  async fetchAds(
    @CurrentUser('id') userId: string,
    @Query() dto: FetchAdsDto,
  ): Promise<AdFetchResponseDto> {
    return this.servingService.fetchAds(userId, dto);
  }

  @Post('track')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track ad view/click/conversion' })
  @ApiResponse({ status: 200, description: 'Event tracked' })
  async trackAd(
    @CurrentUser('id') userId: string,
    @Body() dto: TrackAdDto,
  ): Promise<{ message: string }> {
    await this.servingService.trackEvent(
      userId,
      dto.adId,
      dto.campaignId,
      dto.impressionId,
      dto.eventType,
      dto.placement,
      dto.hobbyContext,
    );
    return { message: 'Event tracked successfully' };
  }

  @Get('admob/context')
  @ApiOperation({ summary: 'Get AdMob context for fallback' })
  async getAdMobContext(
    @Query('placement') placement: string = 'EVENT_DECISION',
    @Query('location_key') locationKey?: string,
  ) {
    return this.servingService.getAdMobContext(placement, locationKey);
  }
}
