import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminService } from './admin.service';
import { AdminQueryDto, ModerationActionDto } from './dto';

@ApiTags('Admin - Ads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/ads')
export class AdminAdsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  @Get('review')
  @ApiOperation({ summary: 'List ads pending review' })
  async listAdsForReview(@Query() query: AdminQueryDto) {
    const { page = 1, limit = 20, moderationStatus = 'pending_review', sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { moderationStatus };

    const [ads, total] = await Promise.all([
      this.prisma.adV2.findMany({
        where,
        include: {
          campaign: {
            include: {
              owner: {
                select: { id: true, email: true, displayName: true },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.adV2.count({ where }),
    ]);

    return {
      ads,
      total,
      page,
      limit,
      hasMore: skip + ads.length < total,
    };
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve, reject, or takedown an ad' })
  async reviewAd(
    @CurrentUser('id') adminId: string,
    @Param('id') adId: string,
    @Body() dto: ModerationActionDto,
  ) {
    const ad = await this.prisma.adV2.findUnique({
      where: { id: adId },
      include: {
        campaign: {
          include: {
            owner: { select: { id: true } },
          },
        },
      },
    });

    if (!ad) {
      throw new NotFoundException('Ad not found');
    }

    const newModerationStatus = this.adminService.getModerationStatus(dto.action);

    await this.prisma.$transaction(async (tx) => {
      await tx.adV2.update({
        where: { id: adId },
        data: {
          moderationStatus: newModerationStatus,
          moderationReasonCode: dto.reasonCode,
          moderationReasonText: dto.reasonText,
          moderatedBy: adminId,
          moderatedAt: new Date(),
        },
      });

      await this.adminService.writeAuditLog(
        adminId,
        'ad',
        adId,
        dto.action,
        dto.reasonCode,
        dto.reasonText,
      );
    });

    // Notify ad owner
    await this.adminService.notifyModerationDecision(
      ad.campaign.ownerId,
      'ad',
      ad.title,
      dto.action,
      dto.reasonText,
    );

    return { message: `Ad ${dto.action}d successfully` };
  }
}
