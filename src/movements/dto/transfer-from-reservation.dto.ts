import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class TransferFromReservationDto {
  @ApiProperty({ example: 2, description: 'ID of the employee initiating the transfer' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @ApiProperty({ example: 5, description: 'ID of the reservation backing this transfer' })
  @Type(() => Number)
  @IsInt()
  reservationId: number;

  @ApiProperty({ example: 3, description: 'ID of the destination warehouse' })
  @Type(() => Number)
  @IsInt()
  destinationWarehouseId: number;
}