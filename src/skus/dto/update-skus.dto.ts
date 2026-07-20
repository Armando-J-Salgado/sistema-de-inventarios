import { PartialType } from '@nestjs/swagger';
import { CreateSkusDto } from './create-skus.dto';

export class UpdateSkusDto extends PartialType(CreateSkusDto) {}
