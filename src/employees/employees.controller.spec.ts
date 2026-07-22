import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

describe('EmployeesController', () => {
  let controller: EmployeesController;

  const mockEmployeesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate creation to service', async () => {
      const dto: CreateEmployeeDto = {
        email: 'john.doe@company.com',
        password: 'ClaveSegura123',
        name: 'Juan Pérez',
        address: 'Av. Principal 123',
        role: 'EMPLOYEE',
      };
      const expectedResult = { id: 1, email: dto.email, name: dto.name, address: dto.address, role: dto.role, active: true };
      mockEmployeesService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(mockEmployeesService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should normalize active query and delegate to service', async () => {
      mockEmployeesService.findAll.mockResolvedValue([]);

      await controller.findAll('true', 'EMPLOYEE');

      expect(mockEmployeesService.findAll).toHaveBeenCalledWith(true, 'EMPLOYEE');
    });
  });

  describe('findOne', () => {
    it('should delegate employee lookup by id', async () => {
      const employee = { id: 1, email: 'john.doe@company.com' };
      mockEmployeesService.findOne.mockResolvedValue(employee);

      const result = await controller.findOne('1');

      expect(mockEmployeesService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(employee);
    });
  });

  describe('update', () => {
    it('should delegate update to service', async () => {
      const dto: UpdateEmployeeDto = { name: 'Juan Carlos Pérez' };
      const updatedEmployee = { id: 1, email: 'john.doe@company.com', name: 'Juan Carlos Pérez' };
      mockEmployeesService.update.mockResolvedValue(updatedEmployee);

      const result = await controller.update('1', dto);

      expect(mockEmployeesService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updatedEmployee);
    });
  });

  describe('remove', () => {
    it('should delegate remove to service', async () => {
      const removedEmployee = { id: 1, email: 'john.doe@company.com', active: false };
      mockEmployeesService.remove.mockResolvedValue(removedEmployee);

      const result = await controller.remove('1');

      expect(mockEmployeesService.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(removedEmployee);
    });
  });
});
