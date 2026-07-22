import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class GetAvailableQueryDto {
  @ApiProperty({ example: 1, description: 'Product variant ID to aggregate available stock for' })
  @Type(() => Number)
  @IsInt()
  variantId: number;

  @ApiPropertyOptional({ example: 1, description: 'Restrict the aggregation to a single warehouse' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;
}
