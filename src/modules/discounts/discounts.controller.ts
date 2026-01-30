import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
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
import { DiscountsService } from './discounts.service';
import { CreateDiscountCodeDto, UpdateDiscountCodeDto } from './dto/discount.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';

interface AuthRequest extends ExpressRequest {
  user?: { userId: string; email: string; role: string };
}

@ApiTags('discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate a discount code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateDiscount(
    @Body() dto: ValidateDiscountDto,
    @Request() req: AuthRequest,
  ) {
    return this.discountsService.validateDiscount(
      dto.code,
      req.user!.userId,
      dto.productType,
      dto.amountMinor,
    );
  }

  @Get('rewards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user available reward discounts' })
  @ApiResponse({ status: 200, description: 'List of available reward discounts' })
  async getUserRewardDiscounts(@Request() req: AuthRequest) {
    return this.discountsService.getUserRewardDiscounts(req.user!.userId);
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create discount code (Admin)' })
  @ApiResponse({ status: 201, description: 'Discount code created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createDiscountCode(@Body() dto: CreateDiscountCodeDto) {
    return this.discountsService.createDiscountCode(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List discount codes (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of discount codes' })
  async listDiscountCodes(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.discountsService.listDiscountCodes(+page, +limit, activeFilter);
  }

  @Get(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get discount code details (Admin)' })
  @ApiParam({ name: 'code', description: 'Discount code' })
  @ApiResponse({ status: 200, description: 'Discount code details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getDiscountCode(@Param('code') code: string) {
    return this.discountsService.getDiscountCode(code);
  }

  @Put(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update discount code (Admin)' })
  @ApiParam({ name: 'code', description: 'Discount code' })
  @ApiResponse({ status: 200, description: 'Discount code updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async updateDiscountCode(
    @Param('code') code: string,
    @Body() dto: UpdateDiscountCodeDto,
  ) {
    return this.discountsService.updateDiscountCode(code, dto);
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate discount code (Admin)' })
  @ApiParam({ name: 'code', description: 'Discount code' })
  @ApiResponse({ status: 200, description: 'Discount code deactivated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async deactivateDiscountCode(@Param('code') code: string) {
    return this.discountsService.deactivateDiscountCode(code);
  }
}
