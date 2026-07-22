import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class CreateIssueDto {
  @ApiProperty({ example: 5, description: 'Number of units to issue from stock' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 3, description: 'ID of the product variant to issue' })
  @Type(() => Number)
  @IsInt()
  productVariantId: number;

  @ApiProperty({ example: 1, description: 'ID of the source warehouse' })
  @Type(() => Number)
  @IsInt()
  warehouseId: number;

  @ApiProperty({ example: 2, description: 'ID of the employee performing the issue' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;
}