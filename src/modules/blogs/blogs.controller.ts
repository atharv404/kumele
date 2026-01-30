import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { BlogsService } from './blogs.service';
import { BlogFilterDto, CreateBlogDto, CreateCommentDto } from './dto';

interface AuthRequest extends ExpressRequest {
  user?: { userId: string; email: string; role: string };
}

@ApiTags('blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get blog feed' })
  @ApiResponse({ status: 200, description: 'Blog feed' })
  async getBlogFeed(@Query() filters: BlogFilterDto) {
    return this.blogsService.getBlogFeed(filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get blog post details' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Blog post details' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async getBlogDetails(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.blogsService.getBlogDetails(id, req.user?.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create blog post' })
  @ApiResponse({ status: 201, description: 'Blog post created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createBlog(@Body() dto: CreateBlogDto, @Request() req: AuthRequest) {
    return this.blogsService.createBlog(req.user!.userId, dto);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like/unlike blog post' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 200, description: 'Like toggled' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async likeBlog(@Param('id') blogId: string, @Request() req: AuthRequest) {
    return this.blogsService.toggleLike(req.user!.userId, blogId);
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment to blog' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async addComment(
    @Param('id') blogId: string,
    @Body() dto: CreateCommentDto,
    @Request() req: AuthRequest,
  ) {
    return this.blogsService.addComment(req.user!.userId, blogId, dto.text);
  }

  @Get(':id/comments')
  @Public()
  @ApiOperation({ summary: 'Get blog comments' })
  @ApiParam({ name: 'id', description: 'Blog post ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Blog comments' })
  async getComments(
    @Param('id') blogId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.blogsService.getComments(blogId, page, limit);
  }
}
