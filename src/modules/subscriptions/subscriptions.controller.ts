import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, CancelSubscriptionDto } from './dto/subscription.dto';
import { Public } from '../../common/decorators/public.decorator';

interface AuthRequest extends ExpressRequest {
  user?: { userId: string; email: string; role: string };
}

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get('tiers')
  @Public()
  @ApiOperation({ summary: 'Get available subscription tiers' })
  @ApiResponse({ status: 200, description: 'List of subscription tiers' })
  async getSubscriptionTiers() {
    return this.subscriptionsService.getSubscriptionTiers();
  }

  // ==================== AUTHENTICATED ENDPOINTS ====================

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription status' })
  @ApiResponse({ status: 200, description: 'Subscription status' })
  async getSubscriptionStatus(@Request() req: AuthRequest) {
    return this.subscriptionsService.getSubscriptionStatus(req.user!.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new subscription (opens Stripe checkout)' })
  @ApiResponse({ status: 200, description: 'Checkout session URL' })
  @ApiResponse({ status: 400, description: 'Already subscribed or invalid tier' })
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @Request() req: AuthRequest,
  ) {
    return this.subscriptionsService.createSubscription(
      req.user!.userId,
      dto.tierId,
      dto.discountCode,
    );
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled' })
  @ApiResponse({ status: 404, description: 'No active subscription' })
  async cancelSubscription(
    @Body() dto: CancelSubscriptionDto,
    @Request() req: AuthRequest,
  ) {
    return this.subscriptionsService.cancelSubscription(
      req.user!.userId,
      dto.cancelImmediately,
    );
  }

  @Post('resume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume subscription pending cancellation' })
  @ApiResponse({ status: 200, description: 'Subscription resumed' })
  @ApiResponse({ status: 404, description: 'No subscription pending cancellation' })
  async resumeSubscription(@Request() req: AuthRequest) {
    return this.subscriptionsService.resumeSubscription(req.user!.userId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription history' })
  @ApiResponse({ status: 200, description: 'Subscription history' })
  async getSubscriptionHistory(@Request() req: AuthRequest) {
    return this.subscriptionsService.getSubscriptionHistory(req.user!.userId);
  }
}
