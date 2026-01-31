import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationCategory } from '../notifications/notification-types.enum';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Write audit log for admin action
   */
  async writeAuditLog(
    adminUserId: string,
    entityType: string,
    entityId: string,
    action: string,
    reasonCode?: string,
    reasonText?: string,
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        adminUserId,
        entityType,
        entityId,
        action,
        reasonCode,
        reasonText,
      },
    });
  }

  /**
   * Get moderation status string based on action
   */
  getModerationStatus(action: string): string {
    switch (action) {
      case 'approve':
        return 'approved';
      case 'reject':
        return 'rejected';
      case 'takedown':
        return 'taken_down';
      default:
        return action;
    }
  }

  /**
   * Send notification to content owner about moderation decision
   */
  async notifyModerationDecision(
    userId: string,
    entityType: string,
    entityTitle: string,
    action: string,
    reasonText?: string,
  ): Promise<void> {
    let type: NotificationType;
    let title: string;
    let body: string;

    switch (action) {
      case 'approve':
        type = NotificationType.CONTENT_APPROVED;
        title = `Your ${entityType} was approved`;
        body = `"${entityTitle}" has been approved and is now live.`;
        break;
      case 'reject':
        type = NotificationType.CONTENT_REJECTED;
        title = `Your ${entityType} was rejected`;
        body = `"${entityTitle}" was rejected.${reasonText ? ` Reason: ${reasonText}` : ''}`;
        break;
      case 'takedown':
        type = NotificationType.CONTENT_TAKEN_DOWN;
        title = `Your ${entityType} was taken down`;
        body = `"${entityTitle}" has been removed.${reasonText ? ` Reason: ${reasonText}` : ''}`;
        break;
      default:
        return;
    }

    await this.notificationsService.notifyOne({
      userId,
      type,
      title,
      body,
      data: { entityType, entityTitle, action },
      category: NotificationCategory.OTHER,
      sendEmail: action === 'takedown',
    });
  }
}
