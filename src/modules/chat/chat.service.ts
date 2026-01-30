import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get chat status for an event
   */
  async getChatStatus(eventId: string, userId: string) {
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { eventId },
    });

    if (!chatRoom) {
      return {
        ok: true,
        data: {
          exists: false,
          message: 'No chat room exists for this event yet',
        },
      };
    }

    // Check if user has access
    const hasAccess = await this.verifyUserChatAccess(eventId, userId);

    return {
      ok: true,
      data: {
        exists: true,
        roomId: chatRoom.id,
        status: chatRoom.status,
        openedAt: chatRoom.openedAt,
        closesAt: chatRoom.closesAt,
        hasAccess,
        isOpen: chatRoom.status === 'ACTIVE' && new Date() < chatRoom.closesAt,
      },
    };
  }

  /**
   * Join event chat (matched participants only)
   */
  async joinChat(eventId: string, userId: string) {
    // 1. Verify chat exists
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { eventId },
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room does not exist');
    }

    // 2. Verify chat is active
    if (chatRoom.status !== 'ACTIVE') {
      throw new ForbiddenException('Chat room is closed');
    }

    if (new Date() >= chatRoom.closesAt) {
      throw new ForbiddenException('Chat has expired');
    }

    // 3. Verify user access (host OR matched participant)
    const hasAccess = await this.verifyUserChatAccess(eventId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You are not authorized to join this chat');
    }

    return {
      ok: true,
      data: {
        roomId: chatRoom.id,
        closesAt: chatRoom.closesAt,
      },
    };
  }

  /**
   * Get chat messages with pagination
   */
  async getChatMessages(eventId: string, userId: string, page = 1, limit = 50) {
    // Verify access
    const hasAccess = await this.verifyUserChatAccess(eventId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You are not authorized to view this chat');
    }

    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { eventId },
    });

    if (!chatRoom) {
      throw new NotFoundException('Chat room not found');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { chatRoomId: chatRoom.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.chatMessage.count({
        where: { chatRoomId: chatRoom.id },
      }),
    ]);

    return {
      ok: true,
      data: messages.reverse(),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create event chat room - called AFTER match exists
   * CRITICAL: Chat created AFTER match, not before
   */
  async createEventChatRoom(eventId: string) {
    // Check if chat already exists
    let chatRoom = await this.prisma.chatRoom.findUnique({
      where: { eventId },
    });

    if (chatRoom) {
      return chatRoom;
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Calculate close time (event end + 24h)
    const eventEndTime = event.eventEndTime || event.endsAt;
    const closesAt = new Date(eventEndTime.getTime() + 24 * 60 * 60 * 1000);

    chatRoom = await this.prisma.chatRoom.create({
      data: {
        eventId,
        status: 'ACTIVE',
        closesAt,
      },
    });

    this.logger.log(`Created chat room for event ${eventId}, closes at ${closesAt}`);

    return chatRoom;
  }

  /**
   * Close expired chat rooms (24h after event)
   */
  async closeExpiredChats() {
    const expiredChats = await this.prisma.chatRoom.findMany({
      where: {
        status: 'ACTIVE',
        closesAt: {
          lt: new Date(),
        },
      },
    });

    for (const chat of expiredChats) {
      await this.prisma.chatRoom.update({
        where: { id: chat.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
      });

      this.logger.log(`Closed chat room ${chat.id} for event ${chat.eventId}`);
    }

    return { closed: expiredChats.length };
  }

  /**
   * CRITICAL: Only matched participants + host can access
   */
  async verifyUserChatAccess(eventId: string, userId: string): Promise<boolean> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return false;
    }

    // Host always has access
    if (event.hostId === userId) {
      return true;
    }

    // Check if user is matched participant
    const participation = await this.prisma.eventJoin.findUnique({
      where: {
        eventId_userId: { userId, eventId },
      },
    });

    return !!(
      participation &&
      ['MATCHED', 'RESERVED', 'CONFIRMED', 'JOINED', 'ATTENDED'].includes(participation.status)
    );
  }
}
