import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSkusDto } from './create-skus.dto';

export class UpdateSkusDto extends PartialType(OmitType(CreateSkusDto, ['id'] as const)) {}
