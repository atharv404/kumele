import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional()
  data?: Record<string, any>;

  @ApiProperty()
  isRead: boolean;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationListResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  notifications: NotificationResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  unreadCount: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasMore: boolean;
}
