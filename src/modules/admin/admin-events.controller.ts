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
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationCategory } from '../notifications/notification-types.enum';
import { AdminQueryDto, ModerationActionDto } from './dto';

@ApiTags('Admin - Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/events')
export class AdminEventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('moderation')
  @ApiOperation({ summary: 'List events pending moderation' })
  async listEventsForModeration(@Query() query: AdminQueryDto) {
    const { page = 1, limit = 20, moderationStatus, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (moderationStatus) {
      where.status = moderationStatus;
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          host: {
            select: { id: true, email: true, displayName: true },
          },
          hobbies: { include: { hobby: true } },
          _count: { select: { joins: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      events,
      total,
      page,
      limit,
      hasMore: skip + events.length < total,
    };
  }

  @Post(':id/moderate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve, reject, or takedown an event' })
  async moderateEvent(
    @CurrentUser('id') adminId: string,
    @Param('id') eventId: string,
    @Body() dto: ModerationActionDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        host: { select: { id: true } },
        joins: { where: { status: { in: ['CONFIRMED', 'JOINED'] } }, select: { userId: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update event status
      const newStatus = dto.action === 'takedown' ? 'CANCELED' : event.status;
      await tx.event.update({
        where: { id: eventId },
        data: {
          status: newStatus,
          isCancelled: dto.action === 'takedown',
          cancelReason: dto.action === 'takedown' ? dto.reasonText : undefined,
        },
      });

      // Write audit log
      await this.adminService.writeAuditLog(
        adminId,
        'event',
        eventId,
        dto.action,
        dto.reasonCode,
        dto.reasonText,
      );
    });

    // Notify host
    await this.adminService.notifyModerationDecision(
      event.hostId,
      'event',
      event.title,
      dto.action,
      dto.reasonText,
    );

    // If takedown, notify all participants
    if (dto.action === 'takedown' && event.joins.length > 0) {
      const userIds = event.joins.map((j) => j.userId);
      await this.notificationsService.notifyMany(
        userIds,
        NotificationType.EVENT_CANCELLED,
        'Event Cancelled',
        `The event "${event.title}" has been cancelled by moderators.`,
        { eventId: event.id, eventTitle: event.title },
        NotificationCategory.MATCHED_EVENTS,
      );
    }

    return { message: `Event ${dto.action}d successfully` };
  }
}
