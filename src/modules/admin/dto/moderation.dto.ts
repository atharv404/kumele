import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class ModerationActionDto {
  @ApiProperty({ 
    description: 'Moderation action', 
    enum: ['approve', 'reject', 'takedown'] 
  })
  @IsIn(['approve', 'reject', 'takedown'])
  action: string;

  @ApiPropertyOptional({ description: 'Reason code' })
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional({ description: 'Detailed reason text' })
  @IsOptional()
  @IsString()
  reasonText?: string;
}

export class UserSuspendDto {
  @ApiProperty({ description: 'Suspension action', enum: ['suspend', 'unsuspend'] })
  @IsIn(['suspend', 'unsuspend'])
  action: string;

  @ApiPropertyOptional({ description: 'Reason for suspension' })
  @IsOptional()
  @IsString()
  reason?: string;
}
