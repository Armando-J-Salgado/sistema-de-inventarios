import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './entities/warehouse.entity';
import { Employee } from 'src/employees/entities/employee.entity';

describe('WarehousesService', () => {
  let service: WarehousesService;

  const mockWarehouseRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockEmployeeRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockWarehouseRepository,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a warehouse with availableCapacity equal to maximumCapacity', async () => {
      const dto = { name: 'Central', maximumCapacity: 1000 };
      const createdWarehouse = { name: 'Central', maximumCapacity: 1000, availableCapacity: 1000 };

      mockWarehouseRepository.findOne.mockResolvedValue(null);
      mockWarehouseRepository.create.mockReturnValue(createdWarehouse);
      mockWarehouseRepository.save.mockResolvedValue({ id: 1, ...createdWarehouse });

      const result = await service.create(dto);

      expect(mockWarehouseRepository.create).toHaveBeenCalledWith({
        name: 'Central',
        maximumCapacity: 1000,
        availableCapacity: 1000,
      });
      expect(result).toEqual({ id: 1, ...createdWarehouse });
    });

    it('should throw ConflictException when warehouse name already exists', async () => {
      const dto = { name: 'Central', maximumCapacity: 1000 };
      mockWarehouseRepository.findOne.mockResolvedValue({ id: 1, name: 'Central' });

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Warehouse name already exists'),
      );
      expect(mockWarehouseRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when administratorId does not exist', async () => {
      const dto = { name: 'Central', maximumCapacity: 1000, administratorId: 99 };

      mockWarehouseRepository.findOne.mockResolvedValueOnce(null);
      mockWarehouseRepository.create.mockReturnValue({ name: 'Central', maximumCapacity: 1000, availableCapacity: 1000 });
      mockEmployeeRepository.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(
        new NotFoundException('The employee with id #99 could not be found'),
      );
    });

    it('should throw BadRequestException when administrator has role ANALYST', async () => {
      const dto = { name: 'Central', maximumCapacity: 1000, administratorId: 5 };

      mockWarehouseRepository.findOne.mockResolvedValueOnce(null);
      mockWarehouseRepository.create.mockReturnValue({ name: 'Central', maximumCapacity: 1000, availableCapacity: 1000 });
      mockEmployeeRepository.findOne.mockResolvedValue({ id: 5, role: 'ANALYST' });

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when administrator already administrates another active warehouse', async () => {
      const dto = { name: 'Central', maximumCapacity: 1000, administratorId: 5 };

      mockWarehouseRepository.findOne
        .mockResolvedValueOnce(null) // name uniqueness check
        .mockResolvedValueOnce({ id: 2, administrator: { id: 5 } }); // existing assignment
      mockWarehouseRepository.create.mockReturnValue({ name: 'Central', maximumCapacity: 1000, availableCapacity: 1000 });
      mockEmployeeRepository.findOne.mockResolvedValue({ id: 5, role: 'WAREHOUSE_MANAGER' });

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Employee is already administrating another warehouse'),
      );
    });
  });

  describe('update', () => {
    it('should increase availableCapacity when maximumCapacity is raised', async () => {
      const existingWarehouse = { id: 1, name: 'Central', maximumCapacity: 1000, availableCapacity: 400, active: true };
      mockWarehouseRepository.findOne.mockResolvedValueOnce(existingWarehouse);
      mockWarehouseRepository.save.mockImplementation(async (w) => w);

      const result = await service.update(1, { maximumCapacity: 1500 });

      expect(result.availableCapacity).toBe(900);
      expect(result.maximumCapacity).toBe(1500);
    });

    it('should throw BadRequestException when lowering maximumCapacity below what is occupied', async () => {
      const existingWarehouse = { id: 1, name: 'Central', maximumCapacity: 1000, availableCapacity: 200, active: true };
      mockWarehouseRepository.findOne.mockResolvedValueOnce(existingWarehouse);

      await expect(service.update(1, { maximumCapacity: 700 })).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when warehouse to update does not exist', async () => {
      mockWarehouseRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(
        new NotFoundException('The warehouse with id #999 could not be found'),
      );
    });
  });

  describe('remove', () => {
    it('should throw ConflictException when warehouse has active stock on hand', async () => {
      const warehouse = { id: 1, active: true, stocks: [{ active: true, quantity: 10 }] };
      mockWarehouseRepository.findOne.mockResolvedValue(warehouse);

      await expect(service.remove(1)).rejects.toThrow(
        new ConflictException('Cannot deactivate warehouse with stock on hand'),
      );
    });

    it('should soft delete warehouse by setting active to false when no stock on hand', async () => {
      const warehouse = { id: 1, active: true, stocks: [] };
      mockWarehouseRepository.findOne.mockResolvedValue(warehouse);
      mockWarehouseRepository.save.mockImplementation(async (w) => w);

      const result = await service.remove(1);

      expect(result.active).toBe(false);
    });

    it('should throw NotFoundException when warehouse to remove is not found', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('The warehouse with id #999 could not be found'),
      );
    });
  });
});
