// dto/find-movements-query.dto.ts
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID } from "class-validator";
import { MovementStatus, MovementType } from "src/enums/movement-type.enum";

export class FindMovementsQueryDto {
  @ApiPropertyOptional({ enum: MovementType, description: 'Filter by movement type' })
  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @ApiPropertyOptional({ enum: MovementStatus, description: 'Filter by movement status' })
  @IsOptional()
  @IsEnum(MovementStatus)
  status?: MovementStatus;

  @ApiPropertyOptional({ example: 3, description: 'Filter by warehouse id (matches source or destination)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  warehouseId?: number;

  @ApiPropertyOptional({ example: 12, description: 'Filter by product variant id (matches source or destination)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  productVariantId?: number;

  @ApiPropertyOptional({ example: 'a1b2c3d4-...', description: 'Filter by transfer group id' })
  @IsOptional()
  @IsUUID()
  transferGroupId?: string;

  @ApiPropertyOptional({ example: '2026-07-01', description: 'Filter movements from this date (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-31', description: 'Filter movements up to this date (inclusive)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}