import { Test, TestingModule } from '@nestjs/testing';
import { IssueMovementStrategy } from './issue-movement.strategy';
import { MovementEntityResolverService } from 'src/movements/support/movement-entity-resolver.service';
import { StockAllocationService } from 'src/movements/support/stock-allocation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sku } from 'src/skus/entities/skus.entity';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ValidationFactory } from 'src/factories/validation.factory';

jest.mock('src/factories/validation.factory');

describe('IssueMovementStrategy', () => {
  let strategy: IssueMovementStrategy;
  let resolver: jest.Mocked<MovementEntityResolverService>;
  let allocationService: jest.Mocked<StockAllocationService>;
  let skuRepo: any;
  let dataSource: any;
  let manager: any;

  beforeEach(async () => {
    const mockResolver = {
      resolveWarehouseAndEmployee: jest.fn(),
      resolveProductVariant: jest.fn(),
    };

    const mockAllocation = {
      buildAllocationPlan: jest.fn(),
    };

    const mockSkuRepo = {
      find: jest.fn(),
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
        IssueMovementStrategy,
        { provide: MovementEntityResolverService, useValue: mockResolver },
        { provide: StockAllocationService, useValue: mockAllocation },
        { provide: getRepositoryToken(Sku), useValue: mockSkuRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    strategy = module.get<IssueMovementStrategy>(IssueMovementStrategy);
    resolver = module.get(MovementEntityResolverService);
    allocationService = module.get(StockAllocationService);
    skuRepo = module.get(getRepositoryToken(Sku));
    dataSource = module.get(DataSource);
    manager = mockManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches SKUs ordered by bestBeforeDate (FEFO)', async () => {
    const dto = { productVariantId: 1, warehouseId: 1, employeeId: 2, quantity: 10 };
    resolver.resolveProductVariant.mockResolvedValue({ id: 1 } as any);
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse: {}, employee: {} } as any);
    skuRepo.find.mockResolvedValue([]);

    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);

    allocationService.buildAllocationPlan.mockResolvedValue({ remaining: 0, allocations: [] });

    await strategy.execute(dto);

    expect(skuRepo.find).toHaveBeenCalledWith({
      where: { productVariant: { id: 1 } },
      order: { bestBeforeDate: 'ASC' },
    });
  });

  it('throws BadRequestException when allocation plan has remaining > 0', async () => {
    const dto = { productVariantId: 1, warehouseId: 1, employeeId: 2, quantity: 10 };
    resolver.resolveProductVariant.mockResolvedValue({ id: 1 } as any);
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse: {}, employee: {} } as any);
    skuRepo.find.mockResolvedValue([]);

    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);

    allocationService.buildAllocationPlan.mockResolvedValue({ remaining: 5, allocations: [] });

    await expect(strategy.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it('creates movements, updates stock/capacity within transaction', async () => {
    const dto = { productVariantId: 1, warehouseId: 1, employeeId: 2, quantity: 10 };
    const warehouse = { id: 1, availableCapacity: 100 };
    resolver.resolveProductVariant.mockResolvedValue({ id: 1 } as any);
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse, employee: {} } as any);
    skuRepo.find.mockResolvedValue([{ unitCost: 5 }]);

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

    manager.create.mockReturnValue({ id: 1 });
    manager.save.mockImplementation(async (_entity: unknown, value: unknown) => value);

    const result = await strategy.execute(dto);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 0 }));
    expect(manager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      type: 'ISSUE',
      status: 'COMPLETED',
      quantity: 10,
      totalCost: 50,
    }));
    expect(manager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ availableCapacity: 110 }));

    expect(result).toEqual([{ id: 1 }]);
  });
});
