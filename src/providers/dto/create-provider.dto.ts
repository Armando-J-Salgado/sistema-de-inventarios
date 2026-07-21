import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProviderDto {
  @ApiProperty({ example: 'Seeds & Juices Inc.', description: 'Name of the provider' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: 'name must contain only letters, spaces and accents' })
  name: string;

  @ApiProperty({ example: 'Blaker Street 182C, New York Av.', description: 'Address of the provider' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'seeds@juices.com', description: 'Email of the provider' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
