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

@ApiTags('Admin - Blogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/blogs')
export class AdminBlogsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  @Get('moderation')
  @ApiOperation({ summary: 'List blogs pending moderation' })
  async listBlogsForModeration(@Query() query: AdminQueryDto) {
    const { page = 1, limit = 20, moderationStatus, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (moderationStatus) {
      where.moderationStatus = moderationStatus;
    } else {
      where.moderationStatus = 'PENDING';
    }

    const [blogs, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: { id: true, email: true, displayName: true },
          },
          hobbyCategory: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      blogs,
      total,
      page,
      limit,
      hasMore: skip + blogs.length < total,
    };
  }

  @Post(':id/moderate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve, reject, or takedown a blog post' })
  async moderateBlog(
    @CurrentUser('id') adminId: string,
    @Param('id') blogId: string,
    @Body() dto: ModerationActionDto,
  ) {
    const blog = await this.prisma.blogPost.findUnique({
      where: { id: blogId },
      include: {
        author: { select: { id: true } },
      },
    });

    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }

    const newModerationStatus = this.adminService.getModerationStatus(dto.action);

    await this.prisma.$transaction(async (tx) => {
      await tx.blogPost.update({
        where: { id: blogId },
        data: {
          moderationStatus: newModerationStatus.toUpperCase(),
          moderation: dto.action === 'approve' ? 'APPROVED' : dto.action === 'reject' ? 'REJECTED' : 'REJECTED',
          isPublished: dto.action === 'approve',
          publishedAt: dto.action === 'approve' ? new Date() : null,
        },
      });

      await this.adminService.writeAuditLog(
        adminId,
        'blog',
        blogId,
        dto.action,
        dto.reasonCode,
        dto.reasonText,
      );
    });

    // Notify author
    await this.adminService.notifyModerationDecision(
      blog.authorId,
      'blog post',
      blog.title,
      dto.action,
      dto.reasonText,
    );

    return { message: `Blog ${dto.action}d successfully` };
  }
}
