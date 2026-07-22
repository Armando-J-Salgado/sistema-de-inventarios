import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({example: 'example@mail.com', description: 'email of the employee'})
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({example: '123456Abc!', description: 'Password to be tested'})
  @IsString()
  @IsNotEmpty()
  password: string;
}