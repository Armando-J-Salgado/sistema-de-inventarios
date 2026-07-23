import { Test, TestingModule } from '@nestjs/testing';
import { ReceiveTransferStrategy } from './receive-transfer.strategy';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Movement } from '../movements/entities/movement.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ValidationFactory } from '../factories/validation.factory';
import { ReceiveDecision } from '../enums/movement-type.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.mock('../factories/validation.factory');

describe('ReceiveTransferStrategy', () => {
  let strategy: ReceiveTransferStrategy;
  let employeeRepo: any;
  let movementRepo: any;
  let warehouseRepo: any;
  let dataSource: any;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEntityManager = {
    save: jest.fn().mockImplementation((entityClass, val) => Promise.resolve(val || entityClass)),
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockEventEmitter = {
      emitAsync: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiveTransferStrategy,
        { provide: getRepositoryToken(Employee), useValue: mockRepo },
        { provide: getRepositoryToken(Movement), useValue: mockRepo },
        { provide: getRepositoryToken(Warehouse), useValue: mockRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter},
      ],
    }).compile();

    strategy = module.get<ReceiveTransferStrategy>(ReceiveTransferStrategy);
    employeeRepo = module.get(getRepositoryToken(Employee));
    movementRepo = module.get(getRepositoryToken(Movement));
    warehouseRepo = module.get(getRepositoryToken(Warehouse));
    dataSource = module.get(DataSource);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws NotFoundException when employee not found', async () => {
    employeeRepo.findOne.mockResolvedValue(null);
    await expect(strategy.execute({ employeeId: 1, transferGroupId: 'uuid', decision: ReceiveDecision.ACCEPT } as any)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when no IN_TRANSIT movements found for the group', async () => {
    employeeRepo.findOne.mockResolvedValue({ id: 1 });
    movementRepo.find.mockResolvedValue([]);
    await expect(strategy.execute({ employeeId: 1, transferGroupId: 'uuid', decision: ReceiveDecision.ACCEPT } as any)).rejects.toThrow(NotFoundException);
  });

  it('ACCEPT branch: increments destinationStock, frees originWarehouse capacity', async () => {
    const dto = { employeeId: 1, transferGroupId: 'uuid', decision: ReceiveDecision.ACCEPT };
    employeeRepo.findOne.mockResolvedValue({ id: 1 });
    warehouseRepo.findOne.mockResolvedValue({ id: 2, availableCapacity: 100 });
    
    const mockMovement = {
      id: 1,
      quantity: 10,
      status: 'IN_TRANSIT',
      sourceStock: { id: 1, warehouse: { id: 1, availableCapacity: 50 } },
      destinationStock: { id: 2, quantity: 20, warehouse: { id: 2 } },
    };
    movementRepo.find.mockResolvedValue([mockMovement]);
    
    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);

    const result = await strategy.execute(dto as any);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 30 })); // destination stock increment
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ availableCapacity: 60 })); // origin warehouse capacity increment
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'COMPLETED' })); // movement completed
    
    expect(result).toEqual([mockMovement]);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('movement.created', expect.objectContaining({ id: 1 }));
  });

  it('REJECT branch: restores sourceStock, frees destinationWarehouse capacity', async () => {
    const dto = { employeeId: 1, transferGroupId: 'uuid', decision: ReceiveDecision.REJECT };
    employeeRepo.findOne.mockResolvedValue({ id: 1 });
    warehouseRepo.findOne.mockResolvedValue({ id: 2, availableCapacity: 100 });
    
    const mockMovement = {
      id: 1,
      quantity: 10,
      status: 'IN_TRANSIT',
      sourceStock: { id: 1, quantity: 5, warehouse: { id: 1, availableCapacity: 50 } },
      destinationStock: { id: 2, warehouse: { id: 2, availableCapacity: 100 } },
    };
    movementRepo.find.mockResolvedValue([mockMovement]);
    
    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);

    const result = await strategy.execute(dto as any);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 15 })); // source stock restored
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ availableCapacity: 110 })); // destination warehouse capacity restored
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'REJECTED' })); // movement rejected
    
    expect(result).toEqual([mockMovement]);
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('movement.created', expect.objectContaining({ id: 1 }));
  });
});
