import {
  Controller,
  Post,
  Get,
  Body,
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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RefundsService } from './refunds.service';
import { RequestRefundDto, AdminProcessRefundDto } from './dto/refund.dto';

interface AuthRequest extends ExpressRequest {
  user?: { userId: string; email: string; role: string };
}

@ApiTags('refunds')
@Controller('refunds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  // ==================== USER ENDPOINTS ====================

  @Get('eligibility/:paymentId')
  @ApiOperation({ summary: 'Check refund eligibility for a payment' })
  @ApiParam({ name: 'paymentId', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Eligibility status' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async checkEligibility(
    @Param('paymentId') paymentId: string,
    @Request() req: AuthRequest,
  ) {
    return this.refundsService.checkRefundEligibility(req.user!.userId, paymentId);
  }

  @Post()
  @ApiOperation({ summary: 'Request a refund' })
  @ApiResponse({ status: 200, description: 'Refund request created' })
  @ApiResponse({ status: 400, description: 'Not eligible for refund' })
  async requestRefund(
    @Body() dto: RequestRefundDto,
    @Request() req: AuthRequest,
  ) {
    return this.refundsService.requestRefund(
      req.user!.userId,
      dto.paymentId,
      dto.reason,
      dto.details,
    );
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get my refund requests' })
  @ApiResponse({ status: 200, description: 'List of refund requests' })
  async getMyRefundRequests(@Request() req: AuthRequest) {
    return this.refundsService.getUserRefundRequests(req.user!.userId);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get pending refund requests (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending refund requests' })
  async getPendingRequests(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.refundsService.getPendingRefundRequests(+page, +limit);
  }

  @Post('process')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Process refund request (Admin)' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async processRefund(
    @Body() dto: AdminProcessRefundDto,
    @Request() req: AuthRequest,
  ) {
    return this.refundsService.processRefund(
      dto.refundRequestId,
      dto.approved,
      dto.notes,
      req.user!.userId,
    );
  }
}
