import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateCategoryDto {
    @ApiProperty({example: 'Red Wines', description: 'Name of the category'})
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    name: string;
}
