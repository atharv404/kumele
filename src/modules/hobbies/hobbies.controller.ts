import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  Post,
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
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HobbiesService } from './hobbies.service';
import { UpdateUserHobbiesDto } from './dto';

interface AuthRequest extends ExpressRequest {
  user?: { userId: string; email: string; role: string };
}

@ApiTags('hobbies')
@Controller('hobbies')
export class HobbiesController {
  constructor(private readonly hobbiesService: HobbiesService) {}

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get all hobby categories' })
  @ApiResponse({ status: 200, description: 'List of hobby categories' })
  async getCategories() {
    return this.hobbiesService.getCategories();
  }

  @Get('categories/:id/hobbies')
  @Public()
  @ApiOperation({ summary: 'Get hobbies by category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'List of hobbies in category' })
  async getHobbiesByCategory(@Param('id') categoryId: string) {
    return this.hobbiesService.getHobbiesByCategory(categoryId);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user hobby preferences' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User hobby preferences' })
  async getUserHobbies(@Param('id') userId: string) {
    return this.hobbiesService.getUserHobbies(userId);
  }

  @Put('users/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user hobby preferences' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Updated hobby preferences' })
  async updateUserHobbies(
    @Param('id') userId: string,
    @Body() dto: UpdateUserHobbiesDto,
    @Request() req: AuthRequest,
  ) {
    // Users can only update their own hobbies (unless admin)
    const targetUserId = req.user!.role === 'ADMIN' ? userId : req.user!.userId;
    return this.hobbiesService.updateUserHobbies(targetUserId, dto.hobbies);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed default hobbies (Admin only)' })
  @ApiResponse({ status: 200, description: 'Hobbies seeded successfully' })
  async seedHobbies() {
    return this.hobbiesService.seedDefaultHobbies();
  }
}
