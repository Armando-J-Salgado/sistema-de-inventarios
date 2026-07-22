import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive } from 'class-validator';
import { LotState } from '../enums/lot-state.enum';

export class CreateLotDto {
	@ApiProperty({ example: 1, description: 'Identifier of the provider that sent the lot' })
	@Type(() => Number)
	@IsInt()
	@IsPositive()
	@IsNotEmpty()
	providerId: number;

	@ApiProperty({ example: '2026-07-22T10:00:00.000Z', description: 'Date the lot was received' })
	@Type(() => Date)
	@IsDate()
	@IsNotEmpty()
	dateOfEntry: Date;

	@ApiPropertyOptional({
		example: LotState.RECEIVED,
		enum: LotState,
		description: 'Status of the lot',
		default: LotState.RECEIVED,
	})
	@IsOptional()
	@IsEnum(LotState)
	state?: LotState;
}
