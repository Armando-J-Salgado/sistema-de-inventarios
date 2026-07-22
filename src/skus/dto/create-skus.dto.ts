import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreateSkusDto {
	@ApiProperty({ example: 'PV1-L1-1', description: 'Unique code for an SKU' })
	@IsString()
	@IsNotEmpty()
	id: string;

	@ApiProperty({ example: 1, description: 'Identifier of the product variant related to the SKU' })
	@IsInt()
	@IsPositive()
	productVariantId: number;

	@ApiProperty({ example: 1, description: 'Identifier of the lot related to the SKU' })
	@IsInt()
	@IsPositive()
	lotId: number;

	@ApiProperty({ example: '2026-07-19T19:17:00.00Z', description: 'Date the SKU was received' })
	@IsDateString()
	dateOfEntry: string;

	@ApiProperty({ example: 10, description: 'Number of units received' })
	@IsInt()
	@Min(0)
	quantity: number;

	@ApiProperty({ example: 10.5, description: 'Cost per unit of this SKU in dollars' })
	@IsNumber()
	@IsPositive()
	unitCost: number;

	@ApiProperty({ example: '2026-08-19T19:17:00.00Z', description: 'Recommended date before consumption' })
	@IsDateString()
	bestBeforeDate: string;
}
