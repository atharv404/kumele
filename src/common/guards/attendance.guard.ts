import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that requires verified attendance (check-in) for an event.
 * 
 * CRITICAL: Check-in is the ONLY proof of attendance [file:37]
 * This guard enforces the rule that reviews, rewards, and escrow release
 * all require verified check-in - not just RSVP or payment.
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, RequireAttendanceGuard)
 * @Post(':id/review')
 * async leaveReview(...) { }
 */
@Injectable()
export class RequireAttendanceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const eventId = request.params?.id || request.body?.eventId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    if (!eventId) {
      throw new ForbiddenException('Event ID required');
    }

    // Check if user has verified attendance
    const checkin = await this.prisma.checkin.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (!checkin || !['HOST_VERIFIED', 'SELF_VERIFIED'].includes(checkin.status)) {
      throw new ForbiddenException(
        'You must attend and check in to this event to perform this action',
      );
    }

    // Attach checkin to request for downstream use
    request.checkin = checkin;

    return true;
  }
}

/**
 * Guard that requires confirmed participation (but not necessarily check-in)
 * Used for pre-event actions like viewing chat, etc.
 */
@Injectable()
export class RequireParticipationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const eventId = request.params?.id || request.body?.eventId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    if (!eventId) {
      throw new ForbiddenException('Event ID required');
    }

    // Check if user is participating
    const participation = await this.prisma.eventJoin.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    const validStatuses = ['MATCHED', 'RESERVED', 'CONFIRMED', 'JOINED', 'ATTENDED'];
    if (!participation || !validStatuses.includes(participation.status)) {
      throw new ForbiddenException('You must be a confirmed participant to perform this action');
    }

    // Attach participation to request for downstream use
    request.participation = participation;

    return true;
  }
}

/**
 * Guard that requires host ownership of an event
 */
@Injectable()
export class RequireHostGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const eventId = request.params?.id || request.body?.eventId;

    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    if (!eventId) {
      throw new ForbiddenException('Event ID required');
    }

    // Check if user is the host
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new ForbiddenException('Event not found');
    }

    if (event.hostId !== userId) {
      throw new ForbiddenException('Only the event host can perform this action');
    }

    // Attach event to request for downstream use
    request.event = event;

    return true;
  }
}
