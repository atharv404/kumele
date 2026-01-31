import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload image or video' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        mediaType: { type: 'string', enum: ['profile', 'blog', 'ad', 'event'] },
        entityId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('mediaType') mediaType: string = 'profile',
    @Query('entityId') entityId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Check if Cloudinary is configured
    const cloudName = this.configService.get('CLOUDINARY_CLOUD_NAME');
    if (!cloudName) {
      // Return mock URL for development
      const mockUrl = `https://res.cloudinary.com/demo/image/upload/v1234567890/${mediaType}/${Date.now()}.${file.originalname.split('.').pop()}`;
      
      const mediaAsset = await this.prisma.mediaAsset.create({
        data: {
          uploadedBy: userId,
          provider: 'cloudinary',
          url: mockUrl,
          mediaType,
          entityId,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });

      return {
        id: mediaAsset.id,
        url: mediaAsset.url,
        mediaType,
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `kumele/${mediaType}`,
          resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    // Save to database
    const mediaAsset = await this.prisma.mediaAsset.create({
      data: {
        uploadedBy: userId,
        provider: 'cloudinary',
        url: uploadResult.secure_url,
        mediaType,
        entityId,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        width: uploadResult.width,
        height: uploadResult.height,
        duration: uploadResult.duration,
      },
    });

    return {
      id: mediaAsset.id,
      url: mediaAsset.url,
      mediaType,
      mimeType: file.mimetype,
      size: file.size,
      width: uploadResult.width,
      height: uploadResult.height,
      duration: uploadResult.duration,
    };
  }
}
