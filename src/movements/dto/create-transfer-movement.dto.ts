import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateTransferMovementDto {
  @ApiProperty({ example: 1, description: 'Stock where the transfer starts' })
  @IsInt()
  @IsPositive()
  sourceStockId: number;

  @ApiProperty({ example: 2, description: 'Stock where the transfer ends' })
  @IsInt()
  @IsPositive()
  destinationStockId: number;

  @ApiProperty({ example: 10, description: 'Quantity being transferred' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 5, description: 'Reservation fulfilled by this transfer', required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  reservationId?: number;
}
