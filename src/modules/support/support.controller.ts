import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { CreateTicketDto, AddTicketReplyDto } from './dto';

@ApiTags('Support')
@Controller('support')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiResponse({
    status: 201,
    description: 'Support ticket created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createTicket(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.supportService.createTicket(userId, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get user\'s support tickets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
  })
  @ApiResponse({
    status: 200,
    description: 'List of user support tickets',
  })
  async getUserTickets(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.supportService.getUserTickets(userId, {
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      status,
    });
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get support ticket details' })
  @ApiResponse({
    status: 200,
    description: 'Ticket details',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getTicketDetails(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
  ) {
    return this.supportService.getTicketDetails(userId, ticketId);
  }

  @Post('tickets/:id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a reply to a support ticket' })
  @ApiResponse({
    status: 200,
    description: 'Reply added successfully',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 400, description: 'Cannot reply to closed ticket' })
  async addReply(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
    @Body() dto: AddTicketReplyDto,
  ) {
    return this.supportService.addReply(userId, ticketId, dto);
  }

  @Post('tickets/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a support ticket' })
  @ApiResponse({
    status: 200,
    description: 'Ticket closed successfully',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async closeTicket(
    @CurrentUser('id') userId: string,
    @Param('id') ticketId: string,
  ) {
    return this.supportService.closeTicket(userId, ticketId);
  }
}
