import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { User } from '@prisma/client';

import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly usersService: UsersService,
  ) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  @ApiOperation({ summary: 'Upload a profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP, max 5MB)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or upload failed' })
  async uploadProfileImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.uploadService.uploadProfileImage(file, user.id);

    // Update user avatar
    await this.usersService.updateProfile(user.id, { avatar: result.url });

    return {
      message: 'Image uploaded successfully',
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  }

  @Post('event-banner')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  @ApiOperation({ summary: 'Upload an event banner image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Event banner image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP, max 5MB)',
        },
        eventId: {
          type: 'string',
          description: 'Event ID (optional, for existing events)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Event banner uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or upload failed' })
  async uploadEventBanner(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('eventId') eventId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.uploadService.uploadEventBanner(
      file,
      eventId || `temp_${user.id}`,
    );

    return {
      message: 'Event banner uploaded successfully',
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  }

  @Post('blog-image')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  @ApiOperation({ summary: 'Upload a blog image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Blog image file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP, max 5MB)',
        },
        blogId: {
          type: 'string',
          description: 'Blog ID (optional, for existing blogs)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Blog image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or upload failed' })
  async uploadBlogImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('blogId') blogId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.uploadService.uploadBlogImage(
      file,
      blogId || `temp_${user.id}`,
    );

    return {
      message: 'Blog image uploaded successfully',
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
    };
  }
}
