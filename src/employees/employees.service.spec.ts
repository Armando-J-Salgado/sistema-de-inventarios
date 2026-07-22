import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('EmployeesService', () => {
  let service: EmployeesService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepository.create.mockReset();
    mockRepository.save.mockReset();
    mockRepository.find.mockReset();
    mockRepository.findOne.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee with hashed password when email is unique', async () => {
      const dto = {
        email: 'john.doe@company.com',
        password: 'ClaveSegura123',
        name: 'Juan Pérez',
        address: 'Av. Principal 123',
        role: 'EMPLOYEE',
      };
      const createdEmployee = { id: 1, ...dto, password: 'hashed-password', active: true };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(createdEmployee);
      mockRepository.save.mockResolvedValue(createdEmployee);

      const result = await service.create(dto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      expect(mockRepository.save).toHaveBeenCalledWith(createdEmployee);
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(dto.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, email: 'john.doe@company.com' });

      await expect(
        service.create({
          email: 'john.doe@company.com',
          password: 'ClaveSegura123',
          name: 'Juan Pérez',
          address: 'Av. Principal 123',
          role: 'EMPLOYEE',
        }),
      ).rejects.toThrow(new ConflictException('El correo electrónico ya está registrado'));
    });
  });

  describe('findAll', () => {
    it('should return all employees with warehouse relation when no filters are provided', async () => {
      const employees = [{ id: 1, email: 'john.doe@company.com' }];
      mockRepository.find.mockResolvedValue(employees);

      const result = await service.findAll(undefined, undefined);

      expect(mockRepository.find).toHaveBeenCalledWith({ relations: { warehouse: true } });
      expect(result).toEqual(employees);
    });

    it('should filter employees by active state and role', async () => {
      const employees = [{ id: 1, email: 'john.doe@company.com', active: true, role: 'EMPLOYEE' }];
      mockRepository.find.mockResolvedValue(employees);

      const result = await service.findAll(true, 'EMPLOYEE');

      expect(mockRepository.find).toHaveBeenCalledWith({
        relations: { warehouse: true },
        where: { active: true, role: 'EMPLOYEE' },
      });
      expect(result).toEqual(employees);
    });
  });

  describe('findOne', () => {
    it('should return employee when found', async () => {
      const employee = { id: 1, email: 'john.doe@company.com', warehouse: null };
      mockRepository.findOne.mockResolvedValue(employee);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: { warehouse: true },
      });
      expect(result).toEqual(employee);
    });

    it('should throw NotFoundException when employee is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(new NotFoundException('Empleado no encontrado'));
    });
  });

  describe('update', () => {
    it('should update employee and hash password when provided', async () => {
      const existingEmployee = {
        id: 1,
        email: 'john.doe@company.com',
        password: 'old-password',
        name: 'John Doe',
        address: 'Av. Principal 123',
        role: 'EMPLOYEE',
        active: true,
        warehouse: null,
      };
      const dto = { name: 'Juan Pérez', password: 'NuevaClave123' };
      const updatedEmployee = { ...existingEmployee, ...dto, password: 'hashed-password' };

      mockRepository.findOne.mockResolvedValueOnce(existingEmployee).mockResolvedValueOnce(null);
      mockRepository.create.mockReturnValue(updatedEmployee);
      mockRepository.save.mockResolvedValue(updatedEmployee);

      const result = await service.update(1, dto);

      expect(mockRepository.save).toHaveBeenCalledWith(updatedEmployee);
      expect(result).not.toHaveProperty('password');
      expect(result.name).toBe('Juan Pérez');
    });

    it('should throw ConflictException when updating email to an existing one', async () => {
      const existingEmployee = {
        id: 1,
        email: 'john.doe@company.com',
        active: true,
        warehouse: null,
      };

      mockRepository.findOne.mockResolvedValueOnce(existingEmployee).mockResolvedValueOnce({ id: 2, email: 'duplicate@company.com' });

      await expect(service.update(1, { email: 'duplicate@company.com' })).rejects.toThrow(
        new ConflictException('El correo electrónico ya está registrado'),
      );
    });

    it('should throw ConflictException when deactivating employee with active warehouse', async () => {
      const existingEmployee = {
        id: 1,
        email: 'john.doe@company.com',
        active: true,
        warehouse: { id: 1, active: true },
      };

      mockRepository.findOne.mockResolvedValueOnce(existingEmployee);

      await expect(service.update(1, { active: false })).rejects.toThrow(
        new ConflictException('El empleado tiene una bodega activa asignada'),
      );
    });

    it('should throw NotFoundException when employee is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Nuevo Nombre' })).rejects.toThrow(
        new NotFoundException('Empleado no encontrado'),
      );
    });
  });

  describe('remove', () => {
    it('should deactivate employee when it has no active warehouse', async () => {
      const existingEmployee = {
        id: 1,
        email: 'john.doe@company.com',
        active: true,
        warehouse: null,
      };

      mockRepository.findOne.mockResolvedValue(existingEmployee);
      mockRepository.save.mockImplementation(async (employee) => employee);

      const result = await service.remove(1);

      expect(mockRepository.save).toHaveBeenCalledWith({ ...existingEmployee, active: false });
      expect(result.active).toBe(false);
    });

    it('should throw ConflictException when employee has an active warehouse assigned', async () => {
      const existingEmployee = {
        id: 1,
        email: 'john.doe@company.com',
        active: true,
        warehouse: { id: 1, active: true },
      };

      mockRepository.findOne.mockResolvedValue(existingEmployee);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('El empleado tiene una bodega activa asignada'),
      );
    });

    it('should throw NotFoundException when employee is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(new NotFoundException('Empleado no encontrado'));
    });
  });
});
