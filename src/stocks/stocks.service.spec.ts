import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StocksService } from './stocks.service';
import { Stock } from './entities/stock.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Sku } from 'src/skus/entities/skus.entity';

describe('StocksService', () => {
  let service: StocksService;
  let stockRepository: jest.Mocked<Repository<Stock>>;
  let reservationRepository: jest.Mocked<Repository<Reservation>>;
  let skuRepository: jest.Mocked<Repository<Sku>>;

  const now = new Date('2026-07-21T12:00:00.00Z');
  const future = new Date('2026-12-31T12:00:00.00Z');
  const past = new Date('2020-01-01T12:00:00.00Z');

  const makeStock = (overrides: Partial<Stock> = {}): Stock => ({
    id: 1,
    quantity: 25,
    active: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null as unknown as Date,
    sku: undefined as any,
    warehouse: undefined as any,
    reservations: [],
    sourceMovements: [],
    destinationMovements: [],
    ...overrides,
  });

  const makeReservation = (overrides: Partial<Reservation> = {}): Reservation => ({
    id: 1,
    quantity: 5,
    fromDate: now,
    toDate: future,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    deletedAt: null as unknown as Date,
    stock: undefined as any,
    movement: undefined as any,
    ...overrides,
  });

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
        {
          provide: getRepositoryToken(Stock),
          useValue: { find: jest.fn(), findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Sku),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
    stockRepository = module.get(getRepositoryToken(Stock));
    reservationRepository = module.get(getRepositoryToken(Reservation));
    skuRepository = module.get(getRepositoryToken(Sku));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll / findOne / update / remove', () => {
    it('findAll returns all stocks', async () => {
      stockRepository.find.mockResolvedValue([makeStock()]);
      const result = await service.findAll();
      expect(result).toEqual([makeStock()]);
    });

    it('findOne throws NotFoundException for an inexistent id', async () => {
      stockRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('update does a partial Object.assign and saves', async () => {
      stockRepository.findOne.mockResolvedValue(makeStock({ quantity: 25 }));
      stockRepository.save.mockImplementation(async (entity) => entity as Stock);
      const result = await service.update(1, { quantity: 30 } as any);
      expect(result.quantity).toBe(30);
    });

    it('remove soft deletes by setting active to false', async () => {
      stockRepository.findOne.mockResolvedValue(makeStock({ active: true }));
      stockRepository.save.mockImplementation(async (entity) => entity as Stock);
      const result = await service.remove(1);
      expect(result.active).toBe(false);
    });
  });

  describe('getAvailable', () => {
    it('throws NotFoundException when the stock does not exist', async () => {
      stockRepository.findOne.mockResolvedValue(null);
      await expect(service.getAvailable(999)).rejects.toThrow(NotFoundException);
    });

    it('equals quantity when there are no reservations', async () => {
      stockRepository.findOne.mockResolvedValue(makeStock({ quantity: 25 }));
      reservationRepository.find.mockResolvedValue([]);
      await expect(service.getAvailable(1)).resolves.toBe(25);
    });

    it('does not discount reservations in a non-active status', async () => {
      stockRepository.findOne.mockResolvedValue(makeStock({ quantity: 25 }));
      reservationRepository.find.mockResolvedValue([]);
      await service.getAvailable(1);
      expect(reservationRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: expect.anything() }),
        }),
      );
    });

    it('clamps to 0 on over-reservation, never negative', async () => {
      stockRepository.findOne.mockResolvedValue(makeStock({ quantity: 10 }));
      reservationRepository.find.mockResolvedValue([
        makeReservation({ quantity: 8 }),
        makeReservation({ id: 2, quantity: 8 }),
      ]);
      await expect(service.getAvailable(1)).resolves.toBe(0);
    });

    it('does not discount an expired reservation (toDate in the past)', async () => {
      stockRepository.findOne.mockResolvedValue(makeStock({ quantity: 25 }));
      reservationRepository.find.mockResolvedValue([makeReservation({ toDate: past, quantity: 10 })]);
      await expect(service.getAvailable(1)).resolves.toBe(25);
    });

    it('discounts a single active, non-expired reservation', async () => {
      stockRepository.findOne.mockResolvedValue(makeStock({ quantity: 25 }));
      reservationRepository.find.mockResolvedValue([makeReservation({ quantity: 10 })]);
      await expect(service.getAvailable(1)).resolves.toBe(15);
    });
  });

  describe('getAvailableByVariantWarehouse', () => {
    it('returns 0 without throwing when the variant has no skus', async () => {
      skuRepository.find.mockResolvedValue([]);
      await expect(service.getAvailableByVariantWarehouse(1)).resolves.toBe(0);
      expect(stockRepository.find).not.toHaveBeenCalled();
    });

    it('returns 0 without throwing when the skus have no stock', async () => {
      skuRepository.find.mockResolvedValue([{ id: 'SKU-1' } as Sku]);
      stockRepository.find.mockResolvedValue([]);
      await expect(service.getAvailableByVariantWarehouse(1)).resolves.toBe(0);
    });

    it('sums available across multiple skus and warehouses', async () => {
      skuRepository.find.mockResolvedValue([{ id: 'SKU-1' } as Sku, { id: 'SKU-2' } as Sku]);
      stockRepository.find.mockResolvedValue([
        makeStock({ id: 10, quantity: 20 }),
        makeStock({ id: 11, quantity: 30 }),
      ]);
      reservationRepository.find.mockResolvedValue([]);
      await expect(service.getAvailableByVariantWarehouse(1)).resolves.toBe(50);
    });

    it('filters by warehouseId when provided', async () => {
      skuRepository.find.mockResolvedValue([{ id: 'SKU-1' } as Sku]);
      stockRepository.find.mockResolvedValue([makeStock({ id: 10, quantity: 20 })]);
      reservationRepository.find.mockResolvedValue([]);

      await service.getAvailableByVariantWarehouse(1, 5);

      expect(stockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ warehouse: { id: 5 } }),
        }),
      );
    });

    it('excludes soft-deleted stocks from the aggregation', async () => {
      skuRepository.find.mockResolvedValue([{ id: 'SKU-1' } as Sku]);
      stockRepository.find.mockResolvedValue([]);
      reservationRepository.find.mockResolvedValue([]);

      await service.getAvailableByVariantWarehouse(1);

      expect(stockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ active: true }),
        }),
      );
    });
  });
});
