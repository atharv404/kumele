import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

interface AuthRequest extends ExpressRequest {
  user?: { userId: string; email: string; role: string };
}

@ApiTags('chat')
@Controller('events/:eventId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event chat room status' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Chat status' })
  async getChatStatus(
    @Param('eventId') eventId: string,
    @Request() req: AuthRequest,
  ) {
    return this.chatService.getChatStatus(eventId, req.user!.userId);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join event chat (matched participants only)' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Joined chat room' })
  @ApiResponse({ status: 403, description: 'Not authorized to join' })
  @ApiResponse({ status: 404, description: 'Chat room not found' })
  async joinChat(
    @Param('eventId') eventId: string,
    @Request() req: AuthRequest,
  ) {
    return this.chatService.joinChat(eventId, req.user!.userId);
  }

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chat messages' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Chat messages' })
  async getChatMessages(
    @Param('eventId') eventId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Request() req: AuthRequest,
  ) {
    return this.chatService.getChatMessages(eventId, req.user!.userId, page, limit);
  }
}
