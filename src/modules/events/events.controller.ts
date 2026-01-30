import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { EventsService } from './events.service';
import {
  CreateEventDto,
  EventFilterDto,
  SelfCheckinDto,
  HostCheckinDto,
  CancelEventDto,
} from './dto';

interface AuthRequest extends ExpressRequest {
  user?: { userId: string; email: string; role: string };
}

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ==================== DAY 6: EVENTS (CORE) ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create event (Host only)' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createEvent(@Body() createEventDto: CreateEventDto, @Request() req: AuthRequest) {
    return this.eventsService.createEvent(req.user!.userId, createEventDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List events with filters' })
  @ApiResponse({ status: 200, description: 'List of events' })
  async listEvents(@Query() filters: EventFilterDto) {
    return this.eventsService.listEvents(filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get event details by ID' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async getEventDetails(@Param('id') id: string) {
    return this.eventsService.getEventDetails(id);
  }

  // ==================== DAY 7: EVENT PARTICIPATION ====================

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join event (triggers matching)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Join request processed' })
  @ApiResponse({ status: 400, description: 'Cannot join event' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async joinEvent(@Param('id') eventId: string, @Request() req: AuthRequest) {
    return this.eventsService.joinEvent(req.user!.userId, eventId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel event (host only)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Only host can cancel' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async cancelEvent(
    @Param('id') eventId: string,
    @Body() body: CancelEventDto,
    @Request() req: AuthRequest,
  ) {
    return this.eventsService.cancelEvent(eventId, req.user!.userId, body.reason);
  }

  @Get(':id/guests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get event guest list (host only)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Guest list' })
  @ApiResponse({ status: 403, description: 'Only host can view guest list' })
  async getGuestList(@Param('id') eventId: string, @Request() req: AuthRequest) {
    return this.eventsService.getGuestList(eventId, req.user!.userId);
  }

  // ==================== DAY 8: CHECK-IN SYSTEM ====================

  @Post(':id/checkin/host-scan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Host scans guest QR to check in' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Guest checked in successfully' })
  @ApiResponse({ status: 400, description: 'Check-in failed' })
  @ApiResponse({ status: 403, description: 'Only host can check in guests' })
  async hostCheckin(
    @Param('id') eventId: string,
    @Body() body: HostCheckinDto,
    @Request() req: AuthRequest,
  ) {
    return this.eventsService.hostCheckin(
      eventId,
      req.user!.userId,
      body.guestUserId,
      body.note,
    );
  }

  @Post(':id/checkin/self')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Self check-in via GPS (≤2km)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Checked in successfully' })
  @ApiResponse({ status: 400, description: 'Check-in failed (too far or invalid)' })
  async selfCheckin(
    @Param('id') eventId: string,
    @Body() body: SelfCheckinDto,
    @Request() req: AuthRequest,
  ) {
    return this.eventsService.selfCheckin(
      eventId,
      req.user!.userId,
      body.guestLat,
      body.guestLng,
    );
  }

  // ==================== DAY 10: MATCH FINALIZATION ====================

  @Post(':id/finalize-matches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finalize all matches and create chat (host only)' })
  @ApiParam({ name: 'id', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Matches finalized, chat created' })
  @ApiResponse({ status: 403, description: 'Only host can finalize matches' })
  async finalizeAllMatches(@Param('id') eventId: string, @Request() req: AuthRequest) {
    return this.eventsService.finalizeAllMatches(eventId, req.user!.userId);
  }

  @Post('participations/:participationId/finalize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finalize single match (host only)' })
  @ApiParam({ name: 'participationId', description: 'Participation ID' })
  @ApiResponse({ status: 200, description: 'Match finalized' })
  @ApiResponse({ status: 403, description: 'Only host can finalize' })
  async finalizeMatch(
    @Param('participationId') participationId: string,
    @Request() req: AuthRequest,
  ) {
    return this.eventsService.finalizeMatch(participationId, req.user!.userId);
  }
}

// ==================== USER ATTENDANCE CONTROLLER ====================

@ApiTags('users')
@Controller('users')
export class UserAttendanceController {
  constructor(private readonly eventsService: EventsService) {}

  @Get(':id/attendance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user attendance history' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Attendance history' })
  async getAttendanceHistory(@Param('id') userId: string) {
    return this.eventsService.getAttendanceHistory(userId);
  }
}
