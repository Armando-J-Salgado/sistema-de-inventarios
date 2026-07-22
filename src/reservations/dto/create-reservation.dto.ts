import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsPositive } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 1, description: 'ID of the source stock' })
  @IsInt()
  @IsPositive()
  sourceStockId: number;

  @ApiProperty({ example: 10, description: 'Quantity to reserve' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: '2026-07-25T10:00:00Z', description: 'Start date of the reservation' })
  @IsDateString()
  fromDate: string;

  @ApiProperty({ example: '2026-07-26T10:00:00Z', description: 'End date of the reservation' })
  @IsDateString()
  toDate: string;
}
