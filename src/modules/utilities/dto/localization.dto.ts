import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LocalizationQueryDto {
  @ApiPropertyOptional({ description: 'Language code', default: 'en' })
  @IsOptional()
  @IsString()
  lang?: string = 'en';

  @ApiPropertyOptional({ description: 'Namespace', default: 'ui' })
  @IsOptional()
  @IsString()
  namespace?: string = 'ui';

  @ApiPropertyOptional({ description: 'Version', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  version?: number = 1;
}
