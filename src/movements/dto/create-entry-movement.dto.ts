import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CreateEntryMovementDto {
  @ApiProperty({ example: 1, description: 'Stock where the entry arrives' })
  @IsInt()
  @IsPositive()
  destinationStockId: number;

  @ApiProperty({ example: 10, description: 'Quantity entering the stock' })
  @IsInt()
  @IsPositive()
  quantity: number;
}
