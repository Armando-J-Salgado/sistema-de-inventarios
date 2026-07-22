import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLotDto } from './create-lot.dto';

export class UpdateLotDto extends PartialType(CreateLotDto) {
  @ApiPropertyOptional({ example: true, description: 'Estado activo o inactivo del lote' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

