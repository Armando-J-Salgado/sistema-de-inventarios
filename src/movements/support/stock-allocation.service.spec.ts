import { Test, TestingModule } from '@nestjs/testing';
import { StockAllocationService } from './stock-allocation.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Stock } from '../../stocks/entities/stock.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';

describe('StockAllocationService', () => {
  let service: StockAllocationService;
  let stockRepo: any;
  let reservationRepo: any;

  beforeEach(async () => {
    const mockStockRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockReservationRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockAllocationService,
        { provide: getRepositoryToken(Stock), useValue: mockStockRepo },
        { provide: getRepositoryToken(Reservation), useValue: mockReservationRepo },
      ],
    }).compile();

    service = module.get<StockAllocationService>(StockAllocationService);
    stockRepo = module.get(getRepositoryToken(Stock));
    reservationRepo = module.get(getRepositoryToken(Reservation));
  });

  describe('buildAllocationPlan', () => {
    const warehouse = { id: 1 } as any;

    it('returns empty allocations and full remaining if skus is empty', async () => {
      const result = await service.buildAllocationPlan([], warehouse, 10);
      expect(result.allocations).toEqual([]);
      expect(result.remaining).toBe(10);
    });

    it('allocates from a single stock if it has enough available', async () => {
      const skus = [{ id: 'SKU-1', bestBeforeDate: new Date('2026-10-10') }];
      const stock = { id: 1, quantity: 20, active: true, sku: skus[0] };
      stockRepo.find.mockResolvedValue([stock]);
      reservationRepo.find.mockResolvedValue([]);

      const result = await service.buildAllocationPlan(skus as any, warehouse, 10);

      expect(result.remaining).toBe(0);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].quantity).toBe(10);
      expect(result.allocations[0].stock).toEqual(stock);
    });

    it('allocates across multiple stocks in FEFO order if one is insufficient', async () => {
      const skus = [
        { id: 'SKU-1', bestBeforeDate: new Date('2026-10-10') },
        { id: 'SKU-2', bestBeforeDate: new Date('2026-11-10') },
      ];
      const stock1 = { id: 1, quantity: 5, active: true, sku: skus[0] };
      const stock2 = { id: 2, quantity: 15, active: true, sku: skus[1] };

      stockRepo.find.mockResolvedValue([stock1, stock2]);
      reservationRepo.find.mockResolvedValue([]);

      const result = await service.buildAllocationPlan(skus as any, warehouse, 10);

      expect(result.remaining).toBe(0);
      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0].quantity).toBe(5);
      expect(result.allocations[1].quantity).toBe(5);
    });

    it('returns remaining > 0 when total available across stocks is insufficient', async () => {
      const skus = [{ id: 'SKU-1', bestBeforeDate: new Date('2026-10-10') }];
      const stock = { id: 1, quantity: 5, active: true, sku: skus[0] };
      stockRepo.find.mockResolvedValue([stock]);
      reservationRepo.find.mockResolvedValue([]);

      const result = await service.buildAllocationPlan(skus as any, warehouse, 10);

      expect(result.remaining).toBe(5);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].quantity).toBe(5);
    });

    it('subtracts active reservation quantities from available quantity before allocating', async () => {
      const skus = [{ id: 'SKU-1', bestBeforeDate: new Date('2026-10-10') }];
      const stock = { id: 1, quantity: 20, active: true, sku: skus[0] };
      stockRepo.find.mockResolvedValue([stock]);
      reservationRepo.find.mockResolvedValue([{ quantity: 15 }]);

      const result = await service.buildAllocationPlan(skus as any, warehouse, 10);

      expect(result.remaining).toBe(5);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0].quantity).toBe(5);
    });

    it('skips stocks with available <= 0 after reservation deduction', async () => {
      const skus = [{ id: 'SKU-1', bestBeforeDate: new Date('2026-10-10') }];
      const stock = { id: 1, quantity: 10, active: true, sku: skus[0] };
      stockRepo.find.mockResolvedValue([stock]);
      reservationRepo.find.mockResolvedValue([{ quantity: 10 }]);

      const result = await service.buildAllocationPlan(skus as any, warehouse, 10);

      expect(result.remaining).toBe(10);
      expect(result.allocations).toHaveLength(0);
    });
  });

  describe('findOrCreateStock', () => {
    const warehouse = { id: 1 } as any;
    const sku = { id: 'SKU-1' } as any;

    it('returns existing stock when found', async () => {
      const existingStock = { id: 1, quantity: 5 };
      const manager = {
        findOne: jest.fn().mockResolvedValue(existingStock),
        create: jest.fn(),
        save: jest.fn(),
      };

      const result = await service.findOrCreateStock(sku, warehouse, manager as any);
      expect(result).toEqual(existingStock);
    });

    it('creates and saves new stock with quantity 0 when not found', async () => {
      const manager = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        save: jest.fn(),
      };
      const newStock = { sku, warehouse, quantity: 0, active: true };
      manager.create.mockReturnValue(newStock);
      manager.save.mockResolvedValue({ id: 2, ...newStock });

      const result = await service.findOrCreateStock(sku, warehouse, manager as any);
      expect(manager.create).toHaveBeenCalledWith(Stock, { sku, warehouse, quantity: 0, active: true });
      expect(manager.save).toHaveBeenCalledWith(Stock, newStock);
      expect(result.id).toBe(2);
    });
  });
});
