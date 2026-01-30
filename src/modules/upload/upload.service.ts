import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  constructor(private readonly configService: ConfigService) {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File, allowedTypes: string[] = this.allowedImageTypes): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum allowed (${this.maxFileSize / 1024 / 1024}MB)`);
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
  }

  /**
   * Upload profile image to Cloudinary
   * Auto-transforms to 500x500, optimized quality
   */
  async uploadProfileImage(file: Express.Multer.File, userId: string): Promise<UploadResult> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'kumele/avatars',
          public_id: `user_${userId}_${Date.now()}`,
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { format: 'auto' },
          ],
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(new BadRequestException('Failed to upload image'));
            return;
          }

          if (!result) {
            reject(new BadRequestException('No upload result returned'));
            return;
          }

          this.logger.log(`Profile image uploaded for user: ${userId}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload event banner image to Cloudinary
   * Auto-transforms to 1200x630 (social media friendly), optimized quality
   */
  async uploadEventBanner(file: Express.Multer.File, eventId: string): Promise<UploadResult> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'kumele/events',
          public_id: `event_${eventId}_${Date.now()}`,
          transformation: [
            { width: 1200, height: 630, crop: 'fill' },
            { quality: 'auto:good' },
            { format: 'auto' },
          ],
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(new BadRequestException('Failed to upload image'));
            return;
          }

          if (!result) {
            reject(new BadRequestException('No upload result returned'));
            return;
          }

          this.logger.log(`Event banner uploaded for event: ${eventId}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload blog image to Cloudinary
   */
  async uploadBlogImage(file: Express.Multer.File, blogId: string): Promise<UploadResult> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'kumele/blogs',
          public_id: `blog_${blogId}_${Date.now()}`,
          transformation: [
            { width: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { format: 'auto' },
          ],
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(new BadRequestException('Failed to upload image'));
            return;
          }

          if (!result) {
            reject(new BadRequestException('No upload result returned'));
            return;
          }

          this.logger.log(`Blog image uploaded for blog: ${blogId}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload ad asset to Cloudinary
   */
  async uploadAdAsset(file: Express.Multer.File, campaignId: string): Promise<UploadResult> {
    this.validateFile(file);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'kumele/ads',
          public_id: `ad_${campaignId}_${Date.now()}`,
          transformation: [
            { quality: 'auto:good' },
            { format: 'auto' },
          ],
          resource_type: 'image',
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(new BadRequestException('Failed to upload image'));
            return;
          }

          if (!result) {
            reject(new BadRequestException('No upload result returned'));
            return;
          }

          this.logger.log(`Ad asset uploaded for campaign: ${campaignId}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted from Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete image: ${(error as Error).message}`);
      throw new BadRequestException('Failed to delete image');
    }
  }
}
