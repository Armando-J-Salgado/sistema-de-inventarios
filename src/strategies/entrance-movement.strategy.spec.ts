import { Test, TestingModule } from '@nestjs/testing';
import { EntranceMovementStrategy } from './entrance-movement.strategy';
import { MovementEntityResolverService } from 'src/movements/support/movement-entity-resolver.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Sku } from 'src/skus/entities/skus.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { NotFoundException } from '@nestjs/common';
import { ValidationFactory } from 'src/factories/validation.factory';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.mock('src/factories/validation.factory');

describe('EntranceMovementStrategy', () => {
  let strategy: EntranceMovementStrategy;
  let resolver: jest.Mocked<MovementEntityResolverService>;
  let skuRepo: any;
  let warehouseRepo: any;
  let stockRepo: any;
  let movementRepo: any;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const mockResolver = {
      resolveWarehouseAndEmployee: jest.fn(),
    };

   const mockEventEmitter = {
     emitAsync: jest.fn(),
   };
    
    skuRepo = { findOne: jest.fn(), save: jest.fn() };
    warehouseRepo = { findOne: jest.fn(), save: jest.fn() };
    stockRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    movementRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntranceMovementStrategy,
        { provide: MovementEntityResolverService, useValue: mockResolver },
        { provide: getRepositoryToken(Sku), useValue: skuRepo },
        { provide: getRepositoryToken(Warehouse), useValue: warehouseRepo },
        { provide: getRepositoryToken(Stock), useValue: stockRepo },
        { provide: getRepositoryToken(Movement), useValue: movementRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter},
      ],
    }).compile();

    strategy = module.get<EntranceMovementStrategy>(EntranceMovementStrategy);
    resolver = module.get(MovementEntityResolverService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws NotFoundException when SKU not found', async () => {
    skuRepo.findOne.mockResolvedValue(null);
    await expect(strategy.execute({ skuId: 'SKU-1' } as any)).rejects.toThrow(NotFoundException);
  });

  it('calls validation chain and performs movement when valid (creates new stock)', async () => {
    const sku = { id: 'SKU-1', quantity: 20, unitCost: 10 };
    const warehouse = { id: 1, availableCapacity: 50 };
    const employee = { id: 2 };
    
    skuRepo.findOne.mockResolvedValue(sku);
    skuRepo.save.mockResolvedValue(sku);
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse, employee } as any);
    
    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);
    
    stockRepo.findOne.mockResolvedValue(null);
    const newStock = { id: 1, quantity: 10 };
    stockRepo.create.mockReturnValue(newStock);
    stockRepo.save.mockResolvedValue(newStock);
    
    const newMovement = { id: 1 };
    movementRepo.create.mockReturnValue(newMovement);
    movementRepo.save.mockResolvedValue(newMovement);
    
    const result = await strategy.execute({ skuId: 'SKU-1', warehouseId: 1, employeeId: 2, quantity: 10 });
    
    expect(ValidationFactory.make).toHaveBeenCalledTimes(4);
    expect(mockHandler.handle).toHaveBeenCalledWith({ warehouse, employee, quantity: 10, sku });
    
    expect(stockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 10, active: true }));
    expect(stockRepo.save).toHaveBeenCalled();
    
    expect(skuRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 10 }));
    expect(warehouseRepo.save).toHaveBeenCalledWith(expect.objectContaining({ availableCapacity: 40 }));
    
    expect(movementRepo.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'ENTRANCE', status: 'COMPLETED', totalCost: 100 }));
    expect(result).toEqual(newMovement);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('movement.created', expect.objectContaining({ id: 1 }));
  });

  it('increments existing stock quantity when stock already exists', async () => {
    const sku = { id: 'SKU-1', quantity: 20, unitCost: 10 };
    const warehouse = { id: 1, availableCapacity: 50 };
    const employee = { id: 2 };
    
    skuRepo.findOne.mockResolvedValue(sku);
    skuRepo.save.mockResolvedValue(sku);
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse, employee } as any);
    
    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);
    
    const existingStock = { id: 1, quantity: 5 };
    stockRepo.findOne.mockResolvedValue(existingStock);
    stockRepo.save.mockResolvedValue(existingStock);
    
    movementRepo.create.mockReturnValue({ id: 1, type: 'ENTRANCE', quantity: 5 });
    movementRepo.save.mockResolvedValue(async (_entity: unknown, value: unknown) => value);
    
    await strategy.execute({ skuId: 'SKU-1', warehouseId: 1, employeeId: 2, quantity: 10 });
    
    expect(stockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 15 }));
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('movement.created', expect.objectContaining({ id: 1 }));
  });

  it('Await-gap fix test: throws error if validator rejects asynchronously', async () => {
    skuRepo.findOne.mockResolvedValue({ id: 'SKU-1', quantity: 20 });
    resolver.resolveWarehouseAndEmployee.mockResolvedValue({ warehouse: {}, employee: {} } as any);
    
    const mockHandler = { 
      setNext: jest.fn().mockReturnThis(), 
      handle: jest.fn().mockRejectedValue(new Error('Validation failed')) 
    };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);
    
    await expect(strategy.execute({ skuId: 'SKU-1', warehouseId: 1, employeeId: 2, quantity: 10 })).rejects.toThrow('Validation failed');
  });
});
