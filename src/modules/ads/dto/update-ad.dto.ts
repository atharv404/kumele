import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAdDto } from './create-ad.dto';

export class UpdateAdDto extends PartialType(OmitType(CreateAdDto, ['campaignId'])) {}
