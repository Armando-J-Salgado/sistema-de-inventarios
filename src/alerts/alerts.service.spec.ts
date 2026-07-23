import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { StocksService } from '../stocks/stocks.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let alertRepository: jest.Mocked<Repository<Alert>>;
  let variantRepository: jest.Mocked<Repository<ProductVariant>>;
  let stocksService: jest.Mocked<StocksService>;

  const now = new Date('2026-07-21T12:00:00.00Z');

  const makeVariant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
    id: 1,
    name: 'Red Wine glass-bottle xxl',
    description: 'desc',
    reorderPoint: 10,
    active: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null as unknown as Date,
    product: undefined as any,
    skus: [],
    alerts: [],
    ...overrides,
  });

  const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
    id: 1,
    title: 'Low stock of product',
    description: 'desc',
    createdAt: now,
    productVariant: undefined as any,
    ...overrides,
  });

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(now);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: getRepositoryToken(Alert),
          useValue: { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: StocksService,
          useValue: { getAvailableByVariantWarehouse: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    alertRepository = module.get(getRepositoryToken(Alert));
    variantRepository = module.get(getRepositoryToken(ProductVariant));
    stocksService = module.get(StocksService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll / findOne', () => {
    it('findAll returns all alerts', async () => {
      alertRepository.find.mockResolvedValue([makeAlert()]);
      await expect(service.findAll()).resolves.toEqual([makeAlert()]);
    });

    it('findOne throws NotFoundException for an inexistent id', async () => {
      alertRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('evaluateAndGenerate', () => {
    it('throws NotFoundException when the variant does not exist', async () => {
      variantRepository.findOne.mockResolvedValue(null);
      await expect(service.evaluateAndGenerate(999)).rejects.toThrow(NotFoundException);
    });

    it('does not generate when the variant is inactive', async () => {
      variantRepository.findOne.mockResolvedValue(makeVariant({ active: false }));
      const result = await service.evaluateAndGenerate(1);
      expect(result).toBeNull();
      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('does not generate when available is above the reorder point', async () => {
      variantRepository.findOne.mockResolvedValue(makeVariant({ reorderPoint: 10 }));
      stocksService.getAvailableByVariantWarehouse.mockResolvedValue(11);
      const result = await service.evaluateAndGenerate(1);
      expect(result).toBeNull();
      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('generates when available equals the reorder point (boundary, <=)', async () => {
      variantRepository.findOne.mockResolvedValue(makeVariant({ reorderPoint: 10 }));
      stocksService.getAvailableByVariantWarehouse.mockResolvedValue(10);
      alertRepository.findOne.mockResolvedValue(null);
      alertRepository.create.mockImplementation((entity) => entity as Alert);
      alertRepository.save.mockImplementation(async (entity) => ({ id: 1, ...entity }) as Alert);

      const result = await service.evaluateAndGenerate(1);

      expect(result).not.toBeNull();
      expect(alertRepository.save).toHaveBeenCalled();
    });

    it('generates when reorderPoint is 0 and available reaches 0', async () => {
      variantRepository.findOne.mockResolvedValue(makeVariant({ reorderPoint: 0 }));
      stocksService.getAvailableByVariantWarehouse.mockResolvedValue(0);
      alertRepository.findOne.mockResolvedValue(null);
      alertRepository.create.mockImplementation((entity) => entity as Alert);
      alertRepository.save.mockImplementation(async (entity) => ({ id: 1, ...entity }) as Alert);

      const result = await service.evaluateAndGenerate(1);
      expect(result).not.toBeNull();
    });

    it('does not generate when reorderPoint is 0 and available is still positive', async () => {
      variantRepository.findOne.mockResolvedValue(makeVariant({ reorderPoint: 0 }));
      stocksService.getAvailableByVariantWarehouse.mockResolvedValue(1);
      const result = await service.evaluateAndGenerate(1);
      expect(result).toBeNull();
    });

    it('generates for a variant with no stock at all (available 0) without throwing', async () => {
      variantRepository.findOne.mockResolvedValue(makeVariant({ reorderPoint: 5 }));
      stocksService.getAvailableByVariantWarehouse.mockResolvedValue(0);
      alertRepository.findOne.mockResolvedValue(null);
      alertRepository.create.mockImplementation((entity) => entity as Alert);
      alertRepository.save.mockImplementation(async (entity) => ({ id: 1, ...entity }) as Alert);

      await expect(service.evaluateAndGenerate(1)).resolves.not.toBeNull();
    });

    it('does not duplicate when a recent alert already exists for the variant', async () => {
      variantRepository.findOne.mockResolvedValue(makeVariant({ reorderPoint: 10 }));
      stocksService.getAvailableByVariantWarehouse.mockResolvedValue(5);
      alertRepository.findOne.mockResolvedValue(makeAlert({ createdAt: now }));

      const result = await service.evaluateAndGenerate(1);

      expect(result).toBeNull();
      expect(alertRepository.save).not.toHaveBeenCalled();
    });

    it('generates again when the existing alert for the variant is old (outside the dedupe window)', async () => {
      const oldDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      variantRepository.findOne.mockResolvedValue(makeVariant({ reorderPoint: 10 }));
      stocksService.getAvailableByVariantWarehouse.mockResolvedValue(5);
      alertRepository.findOne.mockResolvedValue(makeAlert({ createdAt: oldDate }));
      alertRepository.create.mockImplementation((entity) => entity as Alert);
      alertRepository.save.mockImplementation(async (entity) => ({ id: 1, ...entity }) as Alert);

      const result = await service.evaluateAndGenerate(1);
      expect(result).not.toBeNull();
      expect(alertRepository.save).toHaveBeenCalled();
    });
  });
});
