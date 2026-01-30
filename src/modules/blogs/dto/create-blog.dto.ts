import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateBlogDto {
  @ApiProperty({ description: 'Blog post title', example: 'My Football Experience' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Blog post content', example: 'Great match today...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(50)
  content: string;

  @ApiProperty({ required: false, description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiProperty({ required: false, description: 'Hobby category ID' })
  @IsOptional()
  @IsString()
  hobbyCategoryId?: string;

  @ApiProperty({ required: false, description: 'Language code (e.g., en, de)' })
  @IsOptional()
  @IsString()
  language?: string;
}
