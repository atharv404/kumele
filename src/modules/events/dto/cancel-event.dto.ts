import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CancelEventDto {
  @ApiProperty({ description: 'Reason for cancellation' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
