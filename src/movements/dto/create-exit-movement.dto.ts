import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class CreateExitMovementDto {
  @ApiProperty({ example: 1, description: 'Stock where the exit is taken from' })
  @IsInt()
  @IsPositive()
  sourceStockId: number;

  @ApiProperty({ example: 10, description: 'Quantity exiting the stock' })
  @IsInt()
  @IsPositive()
  quantity: number;
}
