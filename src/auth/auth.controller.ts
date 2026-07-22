import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Employee login' })
  @ApiResponse({ status: 201, description: 'JWT token returned' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    const employee = await this.authService.validateEmployee(loginDto.email, loginDto.password);
    if (!employee) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(employee);
  }
}

