import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateProductVariantDto {
  @ApiProperty({ example: 'Red Wine glass-bottle xxl', description: 'Specific presentation of the product' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Delicious Red Wine for parties from the year 1978', description: 'Description of the product' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 10, description: 'Indicates when a reorder is needed based on remaining product' })
  @IsInt()
  @Min(0)
  reorderPoint: number;

  @ApiProperty({ example: 1, description: 'Id of the product this variant belongs to' })
  @IsInt()
  productId: number;
}
