import { ApiProperty } from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({example: 'example@mail.com', description: 'email of the employee'})
  email: string;

  @ApiProperty({example: '123456Abc!', description: 'Password to be tested'})
  password: string;
}