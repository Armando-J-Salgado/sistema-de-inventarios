import { Test, TestingModule } from '@nestjs/testing';
import { IssueFromReservationStrategy } from './issue-from-reservation.strategy';
import { MovementEntityResolverService } from '../movements/support/movement-entity-resolver.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { Movement } from '../movements/entities/movement.entity';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ValidationFactory } from '../factories/validation.factory';
import { EventEmitter2 } from '@nestjs/event-emitter';

jest.mock('../factories/validation.factory');

describe('IssueFromReservationStrategy', () => {
  let strategy: IssueFromReservationStrategy;
  let resolver: jest.Mocked<MovementEntityResolverService>;
  let employeeRepo: any;
  let dataSource: any;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockEntityManager = {
    save: jest.fn().mockImplementation((entityClass, val) => Promise.resolve(val)),
    create: jest.fn().mockImplementation((entityClass, val:any) => ({id: 1, ...val})),
  };

  beforeEach(async () => {
    const mockResolver = {
      resolveWarehouseFromReservation: jest.fn(),
    };

    const mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    const mockMovementRepo = {
      findOne: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) => cb(mockEntityManager)),
    };

   const mockEventEmitter = {
     emitAsync: jest.fn(),
   };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IssueFromReservationStrategy,
        { provide: MovementEntityResolverService, useValue: mockResolver },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(Movement), useValue: mockMovementRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: EventEmitter2, useValue: mockEventEmitter},
      ],
    }).compile();

    strategy = module.get<IssueFromReservationStrategy>(IssueFromReservationStrategy);
    resolver = module.get(MovementEntityResolverService);
    employeeRepo = module.get(getRepositoryToken(Employee));
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

  it('creates movement and updates entities transactionally', async () => {
    const dto = { employeeId: 1, reservationId: 1 };
    employeeRepo.findOne.mockResolvedValue({ id: 1 });
    const reservation = { id: 1, quantity: 10, status: 'ACTIVE' };
    const stock = { id: 1, quantity: 20, sku: { unitCost: 5 } };
    const warehouse = { id: 1, availableCapacity: 50 };
    resolver.resolveWarehouseFromReservation.mockResolvedValue({ reservation, warehouse, stock } as any);
    
    const mockHandler = { setNext: jest.fn().mockReturnThis(), handle: jest.fn().mockResolvedValue(true) };
    (ValidationFactory.make as jest.Mock).mockReturnValue(mockHandler);
    
    const result = await strategy.execute(dto);

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ quantity: 10 })); // stock decrement
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'COMPLETED' })); // reservation status update
    expect(mockEntityManager.save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ availableCapacity: 60 })); // warehouse capacity increment
    expect(mockEntityManager.create).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      type: 'ISSUE',
      status: 'COMPLETED',
      quantity: 10,
      totalCost: 50
    }));
    
    expect(result).toBeDefined();
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith('movement.created', expect.objectContaining({ id: 1 }));
  });
});
