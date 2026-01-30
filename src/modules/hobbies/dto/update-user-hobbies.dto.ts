import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateUserHobbyDto {
  @ApiProperty({ description: 'Hobby ID' })
  @IsString()
  hobbyId: string;

  @ApiProperty({ required: false, minimum: 1, maximum: 5, description: 'Skill level 1-5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  skillLevel?: number;

  @ApiProperty({ required: false, description: 'Is this a primary hobby' })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class UpdateUserHobbiesDto {
  @ApiProperty({ type: [UpdateUserHobbyDto], description: 'List of hobbies' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateUserHobbyDto)
  hobbies: UpdateUserHobbyDto[];
}
