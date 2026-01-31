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
import { AdminQueryDto, UserSuspendDto } from './dto';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all users (admin)' })
  async listUsers(@Query() query: AdminQueryDto) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              hostedEvents: true,
              eventJoins: true,
              blogPosts: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      hasMore: skip + users.length < total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details (admin)' })
  async getUser(@Param('id') userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        hobbies: { include: { hobby: true } },
        _count: {
          select: {
            hostedEvents: true,
            eventJoins: true,
            blogPosts: true,
            supportTickets: true,
          },
        },
      },
    });
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend or unsuspend a user' })
  async suspendUser(
    @CurrentUser('id') adminId: string,
    @Param('id') userId: string,
    @Body() dto: UserSuspendDto,
  ) {
    const newStatus = dto.action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });

      await this.adminService.writeAuditLog(
        adminId,
        'user',
        userId,
        dto.action,
        undefined,
        dto.reason,
      );
    });

    return { message: `User ${dto.action}ed successfully` };
  }
}
