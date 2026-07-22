import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockQueryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const mockEmployeeRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked.jwt.token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepo,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateEmployee', () => {
    it('should return employee when credentials are valid and employee is active', async () => {
      const mockEmployee = {
        id: 1,
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        active: true,
        role: 'ADMINISTRATOR',
      } as Employee;

      mockQueryBuilder.getOne.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateEmployee('test@example.com', 'password123');

      expect(mockEmployeeRepo.createQueryBuilder).toHaveBeenCalledWith('employee');
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('employee.password');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('employee.email = :email', { email: 'test@example.com' });
      expect(result).toEqual(mockEmployee);
    });

    it('should return null when employee is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const result = await service.validateEmployee('unknown@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      const mockEmployee = {
        id: 1,
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        active: true,
      } as Employee;

      mockQueryBuilder.getOne.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateEmployee('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should return null when employee is inactive', async () => {
      const mockEmployee = {
        id: 1,
        email: 'inactive@example.com',
        password: '$2b$10$hashedpassword',
        active: false,
      } as Employee;

      mockQueryBuilder.getOne.mockResolvedValue(mockEmployee);
      (bcrypt.compare as jest.Mock).mockClear();

      const result = await service.validateEmployee('inactive@example.com', 'password123');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should call jwtService.sign with payload and return access_token', async () => {
      const mockEmployee = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMINISTRATOR',
      } as Employee;

      const result = await service.login(mockEmployee);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'test@example.com',
        roles: 'ADMINISTRATOR',
      });
      expect(result).toEqual({ access_token: 'mocked.jwt.token' });
    });
  });
});
