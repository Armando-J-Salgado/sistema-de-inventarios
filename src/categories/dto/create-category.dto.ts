import { ApiProperty } from "@nestjs/swagger";

export class CreateCategoryDto {
    @ApiProperty({example: 'Red Wines', description: 'Name of the category'})
    name: string;
}
