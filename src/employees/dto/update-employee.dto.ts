import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
	@ApiPropertyOptional({ example: true, description: 'Employee active status' })
	@IsOptional()
	@IsBoolean()
	active?: boolean;
}
