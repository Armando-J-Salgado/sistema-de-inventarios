import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class TransferMovementDto {
  @ApiProperty({ example: 8, description: 'Number of units to transfer' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 3, description: 'ID of the product variant to transfer' })
  @Type(() => Number)
  @IsInt()
  productVariantId: number;

  @ApiProperty({ example: 1, description: 'ID of the origin warehouse' })
  @Type(() => Number)
  @IsInt()
  originWarehouseId: number;

  @ApiProperty({ example: 2, description: 'ID of the destination warehouse' })
  @Type(() => Number)
  @IsInt()
  destinationWarehouseId: number;

  @ApiProperty({ example: 4, description: 'ID of the employee performing the transfer' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;
}