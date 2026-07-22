import { Test, TestingModule } from '@nestjs/testing';
import { TransferFromReservationStrategy } from './transfer-from-reservation.strategy';
import { MovementEntityResolverService } from 'src/movements/support/movement-entity-resolver.service';
import { StockAllocationService } from 'src/movements/support/stock-allocation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from 'src/employees/entities/employee.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ValidationFactory } from 'src/factories/validation.factory';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.mock('src/factories/validation.factory');

describe('TransferFromReservationStrategy', () => {
  let strategy: TransferFromReservationStrategy;
  let resolver: jest.Mocked<MovementEntityResolverService>;
  let allocationService: jest.Mocked<StockAllocationService>;
  let employeeRepo: any;
  let warehouseRepo: any;
  let movementRepo: any;
  let dataSource: any;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEntityManager = {
    save: jest.fn().mockImplementation((entityClass, val) => Promise.resolve(val || entityClass)),
    create: jest.fn().mockImplementation((entityClass, val) => val),
  };

  beforeEach(async () => {
    const mockResolver = {
      resolveWarehouseFromReservation: jest.fn(),
    };
    
    const mockAllocation = {
      findOrCreateStock: jest.fn(),
    };

    const mockEventEmitter = {
     emitAsync: jest.fn(),
    };

    employeeRepo = { findOne: jest.fn() };
    warehouseRepo = { findOne: jest.fn() };
    movementRepo = { findOne: jest.fn() };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferFromReservationStrategy,
        { provide: MovementEntityResolverService, useValue: mockResolver },
        { provide: StockAllocationService, useValue: mockAllocation },
        { provide: getRepositoryToken(Employee), useValue: employeeRepo },
        { provide: getRepositoryToken(Warehouse), useValue: warehouseRepo },
        { provide: getRepositoryToken(Movement), useValue: movementRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter},
      ],
    }).compile();

    strategy = module.get<TransferFromReservationStrategy>(TransferFromReservationStrategy);
    resolver = module.get(MovementEntityResolverService);
    allocationService = module.get(StockAllocationService);
    dataSource = module.get(DataSource);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws NotFoundException when employee not found', async () => {
    employeeRepo.findOne.mockResolvedValue(null);
    await expect(strategy.execute({ employeeId: 1 } as any)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when destination warehouse not found', async () => {
    employeeRepo.findOne.mockResolvedValue({ id: 1 });
    resolver.resolveWarehouseFromReservation.mockResolvedValue({ reservation: {}, warehouse: {}, stock: {} } as any);
    warehouseRepo.findOne.mockResolvedValue(null);
    
    await expect(strategy.execute({ employeeId: 1, destinationWarehouseId: 2 } as any)).rejects.toThrow(
      new NotFoundException('The warehouse with ID 2 was not found'),
    );
  });

  it('creates movement and updates entities transactionally', async () => {
    const dto = { employeeId: 1, reservationId: 1, destinationWarehouseId: 2 };
    employeeRepo.findOne.mockResolvedValue({ id: 1 });
    const reservation = { id: 1, quantity: 10, status: 'ACTIVE' };
    const stock = { id: 1, quantity: 20, sku: { unitCost: 5 } };
    resolver.resolveWarehouseFromReservation.mockResolvedValue({ reservation, warehouse: { id: 1 }, stock } as any);
    warehouseRepo.findOne.mockResolvedValue({ id: 2, availableCapacity: 50 });
    
    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);
    
    allocationService.findOrCreateStock.mockResolvedValue({ id: 2 } as any);

    const result = await strategy.execute(dto);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 10 })); // origin stock decrement
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'COMPLETED' })); // reservation status update
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ availableCapacity: 40 })); // destination capacity decrement
    expect(mockEntityManager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      type: 'TRANSFER',
      status: 'IN_TRANSIT',
      quantity: 10,
      totalCost: 50,
      reservation: expect.anything()
    }));
    
    expect(result).toBeDefined();
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('movement.created', expect.objectContaining({ id: 1 }));
  });
});
