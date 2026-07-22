import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { LotState } from '../enums/lot-state.enum';

export class LotQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filter lots by provider id' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  providerId?: number;

  @ApiPropertyOptional({ example: LotState.RECEIVED, enum: LotState, description: 'Filter lots by state' })
  @IsOptional()
  @IsEnum(LotState)
  state?: LotState;

  @ApiPropertyOptional({ example: true, description: 'Filter lots by active flag' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  active?: boolean;
}