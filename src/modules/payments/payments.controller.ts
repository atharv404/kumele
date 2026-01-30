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
import { PaymentsService } from './payments.service';
import { CreateEventPaymentDto } from './dto/create-payment.dto';

interface AuthRequest extends ExpressRequest {
  user?: { userId: string; email: string; role: string };
}

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ==================== DAY 11: EVENT PAYMENTS ====================

  @Post('event')
  @ApiOperation({ summary: 'Create payment intent for event participation' })
  @ApiResponse({ status: 200, description: 'Payment intent created' })
  @ApiResponse({ status: 400, description: 'Invalid payment request' })
  @ApiResponse({ status: 404, description: 'No reserved participation found' })
  async createEventPayment(
    @Body() dto: CreateEventPaymentDto,
    @Request() req: AuthRequest,
  ) {
    return this.paymentsService.createEventPayment(
      req.user!.userId,
      dto.eventId,
      dto.discountCode,
      dto.rewardDiscountId,
    );
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Payment history' })
  async getPaymentHistory(
    @Request() req: AuthRequest,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.paymentsService.getUserPayments(req.user!.userId, +page, +limit);
  }

  @Get(':id/escrow')
  @ApiOperation({ summary: 'Get escrow status for a payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Escrow status' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getEscrowStatus(@Param('id') paymentId: string, @Request() req: AuthRequest) {
    return this.paymentsService.getEscrowStatus(paymentId, req.user!.userId);
  }
}
