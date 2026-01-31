import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum SupportCategory {
  ACCOUNT = 'account',
  PAYMENT = 'payment',
  EVENT = 'event',
  TECHNICAL = 'technical',
  REPORT_USER = 'report_user',
  REPORT_CONTENT = 'report_content',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateTicketDto {
  @ApiProperty({
    description: 'Brief subject of the support ticket',
    example: 'Unable to process payment',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    description: 'Detailed description of the issue',
    example: 'When I try to purchase tickets for an event, the payment fails with error code 500.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(5000)
  description: string;

  @ApiProperty({
    enum: SupportCategory,
    description: 'Category of the support request',
    example: SupportCategory.PAYMENT,
  })
  @IsEnum(SupportCategory)
  category: SupportCategory;

  @ApiPropertyOptional({
    enum: TicketPriority,
    description: 'Priority level (defaults to medium)',
    example: TicketPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'Array of attachment URLs (max 5)',
    example: ['https://res.cloudinary.com/kumele/image/upload/screenshot1.png'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];

  @ApiPropertyOptional({
    description: 'Related entity ID (event, blog, user being reported)',
    example: 'clxyz123456',
  })
  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @ApiPropertyOptional({
    description: 'Type of related entity',
    example: 'event',
  })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;
}

export class AddTicketReplyDto {
  @ApiProperty({
    description: 'Reply message content',
    example: 'Thank you for your response. I have tried the suggested solution...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    description: 'Array of attachment URLs (max 5)',
    example: [],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentUrls?: string[];
}

export class UpdateTicketStatusDto {
  @ApiProperty({
    description: 'New status for the ticket',
    enum: ['open', 'in_progress', 'waiting_user', 'resolved', 'closed'],
    example: 'in_progress',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({
    description: 'Internal note about the status change',
    example: 'Escalated to payment team',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNote?: string;
}

export class AssignTicketDto {
  @ApiProperty({
    description: 'ID of the admin/support agent to assign',
    example: 'clxyz789012',
  })
  @IsString()
  @IsNotEmpty()
  assigneeId: string;
}
