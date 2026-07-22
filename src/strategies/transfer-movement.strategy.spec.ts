import { Test, TestingModule } from '@nestjs/testing';
import { TransferMovementStrategy } from './transfer-movement.strategy';
import { MovementEntityResolverService } from 'src/movements/support/movement-entity-resolver.service';
import { StockAllocationService } from 'src/movements/support/stock-allocation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sku } from 'src/skus/entities/skus.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ValidationFactory } from 'src/factories/validation.factory';

jest.mock('src/factories/validation.factory');

describe('TransferMovementStrategy', () => {
  let strategy: TransferMovementStrategy;
  let resolver: jest.Mocked<MovementEntityResolverService>;
  let allocationService: jest.Mocked<StockAllocationService>;
  let skuRepo: any;
  let warehouseRepo: any;
  let dataSource: any;
  let manager: any;

  beforeEach(async () => {
    const mockResolver = {
      resolveWarehouseAndEmployee: jest.fn(),
      resolveProductVariant: jest.fn(),
    };

    const mockAllocation = {
      buildAllocationPlan: jest.fn(),
      findOrCreateStock: jest.fn(),
    };

    const mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockMovementRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockManager = {
      save: jest.fn(),
      create: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation(async (callback) => callback(mockManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferMovementStrategy,
        { provide: MovementEntityResolverService, useValue: mockResolver },
        { provide: StockAllocationService, useValue: mockAllocation },
        { provide: getRepositoryToken(Sku), useValue: mockRepo },
        { provide: getRepositoryToken(Warehouse), useValue: mockRepo },
        { provide: getRepositoryToken(Movement), useValue: mockMovementRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    strategy = module.get<TransferMovementStrategy>(TransferMovementStrategy);
    resolver = module.get(MovementEntityResolverService);
    allocationService = module.get(StockAllocationService);
    skuRepo = module.get(getRepositoryToken(Sku));
    warehouseRepo = module.get(getRepositoryToken(Warehouse));
    dataSource = module.get(DataSource);
    manager = mockManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws NotFoundException when destination warehouse not found', async () => {
    const dto = { productVariantId: 1, originWarehouseId: 1, destinationWarehouseId: 2, employeeId: 2, quantity: 10 };
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse: {}, employee: {} } as any);
    resolver.resolveProductVariant.mockResolvedValue({ id: 1 } as any);
    skuRepo.find.mockResolvedValue([]);
    warehouseRepo.findOne.mockResolvedValue(null);

    await expect(strategy.execute(dto)).rejects.toThrow('The warehouse with ID 2 was not found');
  });

  it('throws BadRequestException when remaining > 0 (insufficient stock)', async () => {
    const dto = { productVariantId: 1, originWarehouseId: 1, destinationWarehouseId: 2, employeeId: 2, quantity: 10 };
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse: {}, employee: {} } as any);
    resolver.resolveProductVariant.mockResolvedValue({ id: 1 } as any);
    skuRepo.find.mockResolvedValue([]);
    warehouseRepo.findOne.mockResolvedValue({ id: 2 });

    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);

    allocationService.buildAllocationPlan.mockResolvedValue({ remaining: 5, allocations: [] });

    await expect(strategy.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it('creates movements and updates stock/capacity transactionally', async () => {
    const dto = { productVariantId: 1, originWarehouseId: 1, destinationWarehouseId: 2, employeeId: 2, quantity: 10 };
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse: { id: 1 }, employee: {} } as any);
    resolver.resolveProductVariant.mockResolvedValue({ id: 1 } as any);
    skuRepo.find.mockResolvedValue([]);
    warehouseRepo.findOne.mockResolvedValue({ id: 2, availableCapacity: 50 });

    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);

    const stock = {
      id: 1,
      quantity: 10,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      sku: { id: 'SKU-1', unitCost: 5 },
      warehouse: { id: 1 },
    } as any;
    const allocations = [{ stock, quantity: 10 }];
    allocationService.buildAllocationPlan.mockResolvedValue({ remaining: 0, allocations });
    allocationService.findOrCreateStock.mockResolvedValue({ id: 2 } as any);

    manager.create.mockReturnValue({ id: 1 });
    manager.save.mockImplementation(async (_entity: unknown, value: unknown) => value);

    const result = await strategy.execute(dto);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 0 }));
    expect(manager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      type: 'TRANSFER',
      status: 'IN_TRANSIT',
      quantity: 10,
    }));
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ availableCapacity: 40 }));

    expect(result).toEqual([{ id: 1 }]);
    expect(manager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ transferGroupId: expect.any(String) }));
  });
});
