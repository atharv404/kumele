import {
  Controller,
  Get,
  Post,
  Put,
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
import { AdminGuard } from '../admin/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupportService } from './support.service';
import { AddTicketReplyDto, UpdateTicketStatusDto, AssignTicketDto } from './dto';

@ApiTags('Admin - Support')
@Controller('admin/support')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminSupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Get all support tickets (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['account', 'payment', 'event', 'technical', 'report_user', 'report_content', 'feature_request', 'other'],
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @ApiQuery({ name: 'assigneeId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'List of all support tickets',
  })
  async getAllTickets(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('search') search?: string,
  ) {
    return this.supportService.getAllTickets({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      status,
      category,
      priority,
      assigneeId,
      search,
    });
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get support ticket details (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Ticket details',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicketDetails(@Param('id') ticketId: string) {
    return this.supportService.getTicketDetailsAdmin(ticketId);
  }

  @Put('tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  @ApiResponse({
    status: 200,
    description: 'Ticket status updated',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async updateTicketStatus(
    @CurrentUser('id') adminId: string,
    @Param('id') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.supportService.updateTicketStatus(adminId, ticketId, dto);
  }

  @Post('tickets/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign ticket to support agent' })
  @ApiResponse({
    status: 200,
    description: 'Ticket assigned successfully',
  })
  @ApiResponse({ status: 404, description: 'Ticket or assignee not found' })
  async assignTicket(
    @CurrentUser('id') adminId: string,
    @Param('id') ticketId: string,
    @Body() dto: AssignTicketDto,
  ) {
    return this.supportService.assignTicket(adminId, ticketId, dto.assigneeId);
  }

  @Post('tickets/:id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add admin reply to ticket' })
  @ApiResponse({
    status: 200,
    description: 'Reply sent to user',
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async addAdminReply(
    @CurrentUser('id') adminId: string,
    @Param('id') ticketId: string,
    @Body() dto: AddTicketReplyDto,
  ) {
    return this.supportService.addAdminReply(adminId, ticketId, dto);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get support ticket statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Support statistics',
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.supportService.getStatistics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }
}
