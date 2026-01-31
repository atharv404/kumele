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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import {
  RegisterPushTokenDto,
  NotificationQueryDto,
  NotificationListResponseDto,
} from './dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('push-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register FCM push token for current device' })
  @ApiResponse({ status: 200, description: 'Token registered successfully' })
  async registerPushToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterPushTokenDto,
  ): Promise<{ message: string }> {
    await this.notificationsService.registerPushToken(
      userId,
      dto.fcmToken,
      dto.platform,
      dto.deviceId,
      dto.language,
    );
    return { message: 'Push token registered successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get notification feed (paginated)' })
  @ApiResponse({ status: 200, description: 'Notification list', type: NotificationListResponseDto })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notificationsService.getNotifications(userId, query);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ): Promise<{ message: string }> {
    await this.notificationsService.markAsRead(userId, notificationId);
    return { message: 'Notification marked as read' };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string; count: number }> {
    const result = await this.notificationsService.markAllAsRead(userId);
    return { message: 'All notifications marked as read', count: result.count };
  }
}
