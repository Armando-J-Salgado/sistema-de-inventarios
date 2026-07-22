import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class CreateEmployeeDto {
	@ApiProperty({ example: 'john.doe@company.com', description: 'Unique email of the employee' })
	@IsEmail({}, { message: 'El correo electrónico no es válido' })
	@IsNotEmpty({ message: 'El correo electrónico es requerido' })
	email: string;

	@ApiProperty({ example: 'ClaveSegura123', description: 'Password of the employee' })
	@IsString()
	@IsNotEmpty({ message: 'La contraseña es requerida' })
	@MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
	password: string;

	@ApiProperty({ example: 'Juan Pérez', description: 'Employee full name' })
	@IsString()
	@IsNotEmpty({ message: 'El nombre es requerido' })
	@Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
		message: 'El nombre solo puede contener letras, tildes y espacios',
	})
	name: string;

	@ApiProperty({ example: 'Av. Principal 123, Ciudad', description: 'Employee address' })
	@IsString()
	@IsNotEmpty({ message: 'La dirección es requerida' })
	address: string;

	@ApiProperty({ example: 'ADMINISTRATOR', description: 'Employee role' })
	@IsString()
	@IsNotEmpty({ message: 'El rol es requerido' })
	@IsIn(['ADMINISTRATOR', 'EMPLOYEE', 'MANAGER'], { message: 'Rol inválido' })
	role: string;
}
