import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDiscountCodeDto, UpdateDiscountCodeDto } from './dto/discount.dto';

@Injectable()
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new discount code (admin only)
   */
  async createDiscountCode(dto: CreateDiscountCodeDto) {
    // Validate percentage is 0-100
    if (dto.type === 'PERCENTAGE' && (dto.value < 0 || dto.value > 100)) {
      throw new BadRequestException('Percentage must be between 0 and 100');
    }

    const code = dto.code.toUpperCase().trim();

    // Check for duplicates
    const existing = await this.prisma.discountCode.findUnique({
      where: { code },
    });

    if (existing) {
      throw new BadRequestException('Discount code already exists');
    }

    const discountCode = await this.prisma.discountCode.create({
      data: {
        code,
        type: dto.type,
        value: dto.value,
        productTypes: dto.productTypes || [],
        minAmount: dto.minAmountMinor,
        maxUses: dto.maxUses,
        maxUsesPerUser: dto.maxUsesPerUser,
        allowedCountries: dto.allowedCountries || [],
        allowedCities: dto.allowedCities || [],
        userSegments: dto.userSegments || [],
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Created discount code: ${code}`);

    return { ok: true, data: discountCode };
  }

  /**
   * Validate discount code for a purchase
   * CRITICAL: One discount per purchase (highest wins if multiple applied)
   */
  async validateDiscount(
    code: string,
    userId: string,
    productType: string,
    amountMinor: number,
    userCountry?: string,
    userCity?: string,
    userSegment?: string,
  ) {
    const discount = await this.prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        redemptions: { where: { userId } },
      },
    });

    // 1. Code exists and is active
    if (!discount || !discount.isActive) {
      return {
        valid: false,
        message: 'Invalid or inactive discount code',
      };
    }

    // 2. Check date validity
    const now = new Date();
    if (discount.validFrom && now < discount.validFrom) {
      return {
        valid: false,
        message: 'Discount code is not yet valid',
      };
    }
    if (discount.validUntil && now > discount.validUntil) {
      return {
        valid: false,
        message: 'Discount code has expired',
      };
    }

    // 3. Check usage limits
    const totalRedemptions = await this.prisma.discountRedemption.count({
      where: { codeId: discount.id },
    });
    if (discount.maxUses && totalRedemptions >= discount.maxUses) {
      return {
        valid: false,
        message: 'Discount code usage limit reached',
      };
    }
    if (discount.maxUsesPerUser && discount.redemptions.length >= discount.maxUsesPerUser) {
      return {
        valid: false,
        message: 'You have already used this discount code',
      };
    }

    // 4. Check minimum amount
    if (discount.minAmount && amountMinor < discount.minAmount) {
      return {
        valid: false,
        message: `Minimum purchase of ${(discount.minAmount / 100).toFixed(2)} required`,
      };
    }

    // 5. Check product type
    if (discount.productTypes.length > 0 && !discount.productTypes.includes(productType)) {
      return {
        valid: false,
        message: 'Discount code not valid for this product type',
      };
    }

    // 6. Check country restriction
    if (discount.allowedCountries.length > 0 && userCountry) {
      if (!discount.allowedCountries.includes(userCountry)) {
        return {
          valid: false,
          message: 'Discount code not valid in your country',
        };
      }
    }

    // 7. Check city restriction
    if (discount.allowedCities.length > 0 && userCity) {
      if (!discount.allowedCities.includes(userCity)) {
        return {
          valid: false,
          message: 'Discount code not valid in your city',
        };
      }
    }

    // 8. Check user segment
    if (discount.userSegments.length > 0 && userSegment) {
      if (!discount.userSegments.includes(userSegment)) {
        return {
          valid: false,
          message: 'Discount code not valid for your account type',
        };
      }
    }

    // 9. Calculate discount amount
    let discountAmount: number;
    if (discount.type === 'PERCENTAGE') {
      discountAmount = Math.round((amountMinor * discount.value) / 100);
    } else {
      discountAmount = discount.value;
    }

    // Cap discount at purchase amount
    discountAmount = Math.min(discountAmount, amountMinor);

    return {
      valid: true,
      message: 'Discount code is valid',
      discountId: discount.id,
      discountType: discount.type,
      discountValue: discount.value,
      discountAmount,
      finalAmount: amountMinor - discountAmount,
    };
  }

  /**
   * Record discount redemption
   */
  async recordRedemption(
    codeId: string,
    userId: string,
    amountMinor: number,
    currency: string,
    productType: string,
  ) {
    await this.prisma.discountRedemption.create({
      data: {
        codeId,
        userId,
        amountMinor,
        currency,
        productType,
      },
    });

    this.logger.log(`Recorded redemption for code ${codeId} by user ${userId}`);
  }

  /**
   * Get discount code by code string
   */
  async getDiscountCode(code: string) {
    const discount = await this.prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: { select: { redemptions: true } },
      },
    });

    if (!discount) {
      throw new NotFoundException('Discount code not found');
    }

    return {
      ok: true,
      data: {
        ...discount,
        usageCount: discount._count.redemptions,
      },
    };
  }

  /**
   * List all discount codes (admin)
   */
  async listDiscountCodes(page = 1, limit = 20, isActive?: boolean) {
    const skip = (page - 1) * limit;
    const where = isActive !== undefined ? { isActive } : {};

    const [codes, total] = await Promise.all([
      this.prisma.discountCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { redemptions: true } },
        },
      }),
      this.prisma.discountCode.count({ where }),
    ]);

    return {
      ok: true,
      data: codes.map((c) => ({
        ...c,
        usageCount: c._count.redemptions,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update discount code (admin)
   */
  async updateDiscountCode(code: string, dto: UpdateDiscountCodeDto) {
    const existing = await this.prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!existing) {
      throw new NotFoundException('Discount code not found');
    }

    const updated = await this.prisma.discountCode.update({
      where: { code: code.toUpperCase() },
      data: {
        type: dto.type,
        value: dto.value,
        maxUses: dto.maxUses,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        isActive: dto.isActive,
      },
    });

    return { ok: true, data: updated };
  }

  /**
   * Deactivate discount code (admin)
   */
  async deactivateDiscountCode(code: string) {
    const existing = await this.prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!existing) {
      throw new NotFoundException('Discount code not found');
    }

    await this.prisma.discountCode.update({
      where: { code: code.toUpperCase() },
      data: { isActive: false },
    });

    return { ok: true, message: 'Discount code deactivated' };
  }

  /**
   * Get user's available reward discounts
   */
  async getUserRewardDiscounts(userId: string) {
    const rewards = await this.prisma.rewardDiscount.findMany({
      where: {
        userId,
        isRedeemed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    });

    return {
      ok: true,
      data: rewards.map((r) => ({
        id: r.id,
        rewardTier: r.rewardTier,
        type: r.type,
        value: r.value,
        expiresAt: r.expiresAt,
      })),
    };
  }

  /**
   * Create reward discount for user (called by rewards system)
   */
  async createRewardDiscount(
    userId: string,
    rewardTier: string,
    type: 'PERCENTAGE' | 'FIXED',
    value: number,
    expiresInDays: number,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const reward = await this.prisma.rewardDiscount.create({
      data: {
        userId,
        rewardTier,
        type,
        value,
        expiresAt,
      },
    });

    this.logger.log(`Created reward discount for user ${userId}: ${type} ${value}`);

    return reward;
  }
}
