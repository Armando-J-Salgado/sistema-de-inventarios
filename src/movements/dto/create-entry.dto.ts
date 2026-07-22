import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateEntryDto {
  @ApiProperty({ example: 10, description: 'Number of units to enter into stock' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'SKU-001', description: 'SKU identifier of the lot being entered' })
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @ApiProperty({ example: 1, description: 'ID of the destination warehouse' })
  @Type(() => Number)
  @IsInt()
  warehouseId: number;

  @ApiProperty({ example: 2, description: 'ID of the employee performing the entry' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;
}