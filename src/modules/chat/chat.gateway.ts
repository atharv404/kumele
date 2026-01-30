import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisPubSubService } from './redis-pubsub.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  email?: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*', // Configure properly in production
    credentials: true,
  },
})
@Injectable()
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers: Map<string, Set<string>> = new Map(); // roomId -> Set<socketId>

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private redisPubSub: RedisPubSubService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized');
    
    // Subscribe to Redis messages for cross-server broadcasting
    this.redisPubSub.subscribe('chat:message', (message) => {
      this.handleRedisMessage(message);
    });

    this.redisPubSub.subscribe('chat:room:close', (data) => {
      this.handleRoomClose(data);
    });
  }

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      // Authenticate socket connection
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn('Connection attempt without token');
        socket.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      socket.userId = payload.userId || payload.sub;
      socket.email = payload.email;

      this.logger.log(`Client connected: ${socket.id} (user: ${socket.userId})`);
    } catch (error: any) {
      this.logger.warn(`Authentication failed: ${error.message}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${socket.id}`);
    
    // Remove from all rooms
    this.connectedUsers.forEach((sockets, roomId) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        this.connectedUsers.delete(roomId);
      }
    });
  }

  /**
   * Join a chat room
   */
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { eventId: string },
  ) {
    if (!socket.userId) {
      throw new WsException('Not authenticated');
    }

    const { eventId } = data;

    // Verify user has access to this chat
    const hasAccess = await this.verifyUserChatAccess(eventId, socket.userId);
    if (!hasAccess) {
      throw new WsException('Not authorized to join this chat');
    }

    // Verify chat is active
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { eventId },
    });

    if (!chatRoom || chatRoom.status !== 'ACTIVE') {
      throw new WsException('Chat room is not available');
    }

    if (new Date() >= chatRoom.closesAt) {
      throw new WsException('Chat has expired');
    }

    // Join Socket.IO room
    const roomId = `event:${eventId}`;
    await socket.join(roomId);

    // Track connected users
    if (!this.connectedUsers.has(roomId)) {
      this.connectedUsers.set(roomId, new Set());
    }
    this.connectedUsers.get(roomId)!.add(socket.id);

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: socket.userId },
      select: { id: true, displayName: true, firstName: true, avatar: true },
    });

    // Notify room of new participant
    socket.to(roomId).emit('user_joined', {
      userId: socket.userId,
      displayName: user?.displayName || user?.firstName,
      avatar: user?.avatar,
    });

    this.logger.log(`User ${socket.userId} joined room ${roomId}`);

    return {
      success: true,
      roomId,
      chatRoomId: chatRoom.id,
      closesAt: chatRoom.closesAt,
    };
  }

  /**
   * Leave a chat room
   */
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { eventId: string },
  ) {
    const roomId = `event:${data.eventId}`;
    await socket.leave(roomId);

    this.connectedUsers.get(roomId)?.delete(socket.id);

    socket.to(roomId).emit('user_left', {
      userId: socket.userId,
    });

    this.logger.log(`User ${socket.userId} left room ${roomId}`);

    return { success: true };
  }

  /**
   * Send a message to a room
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { eventId: string; content: string },
  ) {
    if (!socket.userId) {
      throw new WsException('Not authenticated');
    }

    const { eventId, content } = data;

    if (!content || content.trim().length === 0) {
      throw new WsException('Message cannot be empty');
    }

    if (content.length > 2000) {
      throw new WsException('Message too long (max 2000 characters)');
    }

    // Verify access
    const hasAccess = await this.verifyUserChatAccess(eventId, socket.userId);
    if (!hasAccess) {
      throw new WsException('Not authorized to send messages');
    }

    // Get chat room
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { eventId },
    });

    if (!chatRoom || chatRoom.status !== 'ACTIVE') {
      throw new WsException('Chat room is not available');
    }

    if (new Date() >= chatRoom.closesAt) {
      throw new WsException('Chat has expired');
    }

    // Save message to database
    const message = await this.prisma.chatMessage.create({
      data: {
        chatRoomId: chatRoom.id,
        userId: socket.userId,
        content: content.trim(),
      },
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
    });

    // Format message for broadcast
    const messagePayload = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      user: message.user,
    };

    // Publish to Redis for multi-server broadcasting
    await this.redisPubSub.publish('chat:message', {
      roomId: `event:${eventId}`,
      message: messagePayload,
    });

    // Broadcast to local server (Redis subscriber will broadcast to other servers)
    const roomId = `event:${eventId}`;
    this.server.to(roomId).emit('new_message', messagePayload);

    this.logger.debug(`Message sent to room ${roomId} by user ${socket.userId}`);

    return { success: true, messageId: message.id };
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { eventId: string },
  ) {
    const roomId = `event:${data.eventId}`;
    
    socket.to(roomId).emit('user_typing', {
      userId: socket.userId,
      isTyping: true,
    });

    return { success: true };
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { eventId: string },
  ) {
    const roomId = `event:${data.eventId}`;
    
    socket.to(roomId).emit('user_typing', {
      userId: socket.userId,
      isTyping: false,
    });

    return { success: true };
  }

  /**
   * Handle messages from Redis (cross-server broadcasting)
   */
  private handleRedisMessage(data: { roomId: string; message: any }) {
    // Broadcast to all local clients in the room
    this.server.to(data.roomId).emit('new_message', data.message);
  }

  /**
   * Handle room close notification from Redis
   */
  private handleRoomClose(data: { roomId: string }) {
    // Notify all clients and disconnect them
    this.server.to(data.roomId).emit('room_closed', {
      message: 'Chat room has been closed',
    });

    // Disconnect all sockets from this room
    this.server.in(data.roomId).socketsLeave(data.roomId);
    this.connectedUsers.delete(data.roomId);

    this.logger.log(`Room ${data.roomId} closed and all clients disconnected`);
  }

  /**
   * Verify user has access to event chat
   */
  private async verifyUserChatAccess(eventId: string, userId: string): Promise<boolean> {
    // Check if user is host
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (event?.hostId === userId) {
      return true;
    }

    // Check if user is a matched/confirmed participant
    const participation = await this.prisma.eventJoin.findFirst({
      where: {
        eventId,
        userId,
        status: { in: ['MATCHED', 'CONFIRMED', 'ATTENDED'] },
        matchFinalizedAt: { not: null },
      },
    });

    return !!participation;
  }

  /**
   * Get online users in a room
   */
  async getOnlineUsers(eventId: string): Promise<string[]> {
    const roomId = `event:${eventId}`;
    const sockets = await this.server.in(roomId).fetchSockets();
    return sockets.map((s) => (s as any).userId).filter(Boolean);
  }

  /**
   * Close a chat room (called by ChatService when room expires)
   */
  async closeRoom(eventId: string) {
    const roomId = `event:${eventId}`;
    
    // Publish to Redis for multi-server handling
    await this.redisPubSub.publish('chat:room:close', { roomId });
    
    // Handle locally as well
    this.handleRoomClose({ roomId });
  }
}
