import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class CreateWarehouseDto {
    @ApiProperty({example: 'Central Warehouse', description: 'Name of the warehouse'})
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;

    @ApiProperty({example: 1000, description: 'Maximum storage capacity of the warehouse'})
    @IsInt()
    @IsPositive()
    maximumCapacity: number;

    @ApiPropertyOptional({example: 1, description: 'ID of the employee responsible for the warehouse', required: false})
    @IsOptional()
    @IsInt()
    @IsPositive()
    administratorId?: number;
}
