import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  GoneException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateShareTokenDto, ShareTokenResponseDto, ResolvedShareTokenDto } from './dto';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Share')
@Controller('share')
export class ShareController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Post('token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a share token for an entity' })
  @ApiResponse({ status: 201, description: 'Share token created', type: ShareTokenResponseDto })
  async createShareToken(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateShareTokenDto,
  ): Promise<ShareTokenResponseDto> {
    // Verify entity exists
    const entityExists = await this.verifyEntityExists(dto.entityType, dto.entityId);
    if (!entityExists) {
      throw new NotFoundException(`${dto.entityType} not found`);
    }

    // Generate unique token (short alphanumeric)
    const token = this.generateShortToken();

    // Default expiry: 30 days
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const shareToken = await this.prisma.shareToken.create({
      data: {
        token,
        entityType: dto.entityType,
        entityId: dto.entityId,
        createdBy: userId,
        expiresAt,
      },
    });

    const appUrl = this.configService.get('APP_URL', 'https://kumele.com');

    return {
      token: shareToken.token,
      shareUrl: `${appUrl}/share/${shareToken.token}`,
      entityType: shareToken.entityType,
      entityId: shareToken.entityId,
      expiresAt: shareToken.expiresAt || undefined,
    };
  }

  @Get('resolve/:token')
  @Public()
  @ApiOperation({ summary: 'Resolve a share token to its entity' })
  @ApiResponse({ status: 200, description: 'Resolved share token', type: ResolvedShareTokenDto })
  async resolveToken(@Param('token') token: string): Promise<ResolvedShareTokenDto> {
    const shareToken = await this.prisma.shareToken.findUnique({
      where: { token },
    });

    if (!shareToken) {
      throw new NotFoundException('Share token not found');
    }

    // Check expiry
    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      throw new GoneException('Share token has expired');
    }

    // Build deep link
    const deepLink = `kumele://${shareToken.entityType}s/${shareToken.entityId}`;

    // Fetch entity details
    const entity = await this.fetchEntity(shareToken.entityType, shareToken.entityId);

    return {
      entityType: shareToken.entityType,
      entityId: shareToken.entityId,
      deepLink,
      entity: entity || undefined,
    };
  }

  private async verifyEntityExists(entityType: string, entityId: string): Promise<boolean> {
    if (entityType === 'event') {
      const event = await this.prisma.event.findUnique({ where: { id: entityId } });
      return !!event;
    } else if (entityType === 'blog') {
      const blog = await this.prisma.blogPost.findUnique({ where: { id: entityId } });
      return !!blog;
    }
    return false;
  }

  private async fetchEntity(entityType: string, entityId: string): Promise<Record<string, any> | null> {
    if (entityType === 'event') {
      return this.prisma.event.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          title: true,
          description: true,
          coverImage: true,
          startsAt: true,
          city: true,
        },
      });
    } else if (entityType === 'blog') {
      return this.prisma.blogPost.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          title: true,
          excerpt: true,
          coverImage: true,
          author: { select: { displayName: true } },
        },
      });
    }
    return null;
  }

  private generateShortToken(): string {
    // Generate 8-character alphanumeric token
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
