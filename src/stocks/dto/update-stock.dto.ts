import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateStockDto {
  @ApiPropertyOptional({ example: 25, description: 'Quantity available in stock' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;
}
