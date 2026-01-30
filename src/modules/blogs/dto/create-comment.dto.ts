import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'Comment text', example: 'Great post!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}
