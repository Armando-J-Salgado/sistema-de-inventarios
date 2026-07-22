import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import { Employee } from '../employees/entities/employee.entity';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    validateEmployee: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return access_token when credentials are valid', async () => {
      const loginDto: LoginDto = { email: 'admin@example.com', password: 'password123' };
      const mockEmployee = { id: 1, email: loginDto.email, role: 'ADMINISTRATOR' } as Employee;
      const expectedResult = { access_token: 'valid.token' };

      mockAuthService.validateEmployee.mockResolvedValue(mockEmployee);
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.validateEmployee).toHaveBeenCalledWith('admin@example.com', 'password123');
      expect(authService.login).toHaveBeenCalledWith(mockEmployee);
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto: LoginDto = { email: 'wrong@example.com', password: 'wrongpassword' };
      mockAuthService.validateEmployee.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
      expect(authService.validateEmployee).toHaveBeenCalledWith('wrong@example.com', 'wrongpassword');
      expect(authService.login).not.toHaveBeenCalled();
    });
  });
});
