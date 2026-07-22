import { Test, TestingModule } from '@nestjs/testing';
import { MovementsService } from './movements.service';
import { MovementStrategyFactory } from 'src/factories/movement-strategy.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Movement } from './entities/movement.entity';
import { ReceiveTransferStrategy } from 'src/strategies/receive-transfer.strategy';
import { MovementType, MovementStatus } from 'src/enums/movement-type.enum';
import { NotFoundException } from '@nestjs/common';
import { ReceiveDecision } from 'src/enums/movement-type.enum';

describe('MovementsService', () => {
  let service: MovementsService;
  let factory: jest.Mocked<MovementStrategyFactory>;
  let repository: any;
  let receiveStrategy: jest.Mocked<ReceiveTransferStrategy>;

  beforeEach(async () => {
    const mockFactory = {
      make: jest.fn(),
    };
    
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
    };

    const mockRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const mockReceiveStrategy = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementsService,
        { provide: MovementStrategyFactory, useValue: mockFactory },
        { provide: getRepositoryToken(Movement), useValue: mockRepo },
        { provide: ReceiveTransferStrategy, useValue: mockReceiveStrategy },
      ],
    }).compile();

    service = module.get<MovementsService>(MovementsService);
    factory = module.get(MovementStrategyFactory);
    repository = module.get(getRepositoryToken(Movement));
    receiveStrategy = module.get(ReceiveTransferStrategy);
  });

  it('createEntry — calls factory with ENTRANCE and executes', async () => {
    const strategy = { execute: jest.fn().mockResolvedValue({ id: 1 }) };
    factory.make.mockReturnValue(strategy as any);
    const dto: any = { quantity: 10 };
    
    const res = await service.createEntry(dto);
    
    expect(factory.make).toHaveBeenCalledWith(MovementType.ENTRANCE);
    expect(strategy.execute).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 1 });
  });

  it('createIssue — calls factory with ISSUE and executes', async () => {
    const strategy = { execute: jest.fn().mockResolvedValue([{ id: 1 }]) };
    factory.make.mockReturnValue(strategy as any);
    const dto: any = { quantity: 5 };
    
    const res = await service.createIssue(dto);
    
    expect(factory.make).toHaveBeenCalledWith(MovementType.ISSUE);
    expect(strategy.execute).toHaveBeenCalledWith(dto);
    expect(res).toEqual([{ id: 1 }]);
  });

  it('createIssueFromTransfer — calls factory with ISSUE_FROM_RESERVATION and executes', async () => {
    const strategy = { execute: jest.fn().mockResolvedValue({ id: 1 }) };
    factory.make.mockReturnValue(strategy as any);
    const dto: any = { reservationId: 1 };
    
    const res = await service.createIssueFromTransfer(dto);
    
    expect(factory.make).toHaveBeenCalledWith(MovementType.ISSUE_FROM_RESERVATION);
    expect(strategy.execute).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 1 });
  });

  it('createTransfer — calls factory with TRANSFER and executes', async () => {
    const strategy = { execute: jest.fn().mockResolvedValue([{ id: 1 }]) };
    factory.make.mockReturnValue(strategy as any);
    const dto: any = { quantity: 5 };
    
    const res = await service.createTransfer(dto);
    
    expect(factory.make).toHaveBeenCalledWith(MovementType.TRANSFER);
    expect(strategy.execute).toHaveBeenCalledWith(dto);
    expect(res).toEqual([{ id: 1 }]);
  });

  it('createTransferFromReservation — calls factory with TRANSFER_FROM_RESERVATION and executes', async () => {
    const strategy = { execute: jest.fn().mockResolvedValue({ id: 1 }) };
    factory.make.mockReturnValue(strategy as any);
    const dto: any = { reservationId: 1 };
    
    const res = await service.createTransferFromReservation(dto);
    
    expect(factory.make).toHaveBeenCalledWith(MovementType.TRANSFER_FROM_RESERVATION);
    expect(strategy.execute).toHaveBeenCalledWith(dto);
    expect(res).toEqual({ id: 1 });
  });

  it('receiveTransfer — calls receiveTransferStrategy directly', async () => {
    receiveStrategy.execute.mockResolvedValue([{ id: 1 }] as any);
    const dto: any = { decision: ReceiveDecision.ACCEPT };
    
    const res = await service.receiveTransfer(dto);
    
    expect(receiveStrategy.execute).toHaveBeenCalledWith(dto);
    expect(res).toEqual([{ id: 1 }]);
  });

  describe('findOne', () => {
    it('returns a movement when found', async () => {
      repository.findOne.mockResolvedValue({ id: 1 });
      const res = await service.findOne(1);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: { sourceStock: true } });
      expect(res).toEqual({ id: 1 });
    });

    it('throws NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns all movements without filters', async () => {
      const qb = repository.createQueryBuilder();
      const res = await service.findAll({});
      expect(qb.getMany).toHaveBeenCalled();
      expect(res).toEqual([{ id: 1 }]);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('applies type filter', async () => {
      const qb = repository.createQueryBuilder();
      await service.findAll({ type: MovementType.ENTRANCE });
      expect(qb.andWhere).toHaveBeenCalledWith('movement.type = :type', { type: MovementType.ENTRANCE });
    });

    it('applies status filter', async () => {
      const qb = repository.createQueryBuilder();
      await service.findAll({ status: MovementStatus.COMPLETED });
      expect(qb.andWhere).toHaveBeenCalledWith('movement.status = :status', { status: MovementStatus.COMPLETED });
    });

    it('applies transferGroupId filter', async () => {
      const qb = repository.createQueryBuilder();
      await service.findAll({ transferGroupId: 'uuid' });
      expect(qb.andWhere).toHaveBeenCalledWith('movement.transferGroupId = :transferGroupId', { transferGroupId: 'uuid' });
    });

    it('applies warehouseId filter even if 0', async () => {
      const qb = repository.createQueryBuilder();
      await service.findAll({ warehouseId: 0 });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(sourceWarehouse.id = :warehouseId OR destinationWarehouse.id = :warehouseId)',
        { warehouseId: 0 }
      );
    });

    it('applies productVariantId filter', async () => {
      const qb = repository.createQueryBuilder();
      await service.findAll({ productVariantId: 1 });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(sourceProductVariant.id = :productVariantId OR destinationProductVariant.id = :productVariantId)',
        { productVariantId: 1 }
      );
    });

    it('applies dateFrom filter', async () => {
      const qb = repository.createQueryBuilder();
      await service.findAll({ dateFrom: '2026-07-01' });
      expect(qb.andWhere).toHaveBeenCalledWith('movement.date >= :dateFrom', { dateFrom: '2026-07-01' });
    });

    it('applies dateTo filter', async () => {
      const qb = repository.createQueryBuilder();
      await service.findAll({ dateTo: '2026-07-31' });
      expect(qb.andWhere).toHaveBeenCalledWith('movement.date <= :dateTo', { dateTo: '2026-07-31' });
    });
  });
});
