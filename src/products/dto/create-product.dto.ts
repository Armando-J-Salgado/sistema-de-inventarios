import { IsString, IsPositive, IsNotEmpty, IsNumber, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Vino Tinto', description: 'Name of the product' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { message: 'name must contain only letters and spaces' })
  name: string;

  @ApiProperty({ example: 1, description: 'ID of the category' })
  @IsNumber()
  @IsPositive()
  categoryId: number;

  @ApiProperty({ example: 1, description: 'ID of the provider' })
  @IsNumber()
  @IsPositive()
  providerId: number;

  @ApiProperty({ example: 'Botella', description: 'Unit of measurement' })
  @IsString()
  @IsNotEmpty()
  unitOfMeasurement: string;
}
