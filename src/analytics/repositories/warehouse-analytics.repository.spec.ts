import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseAnalyticsRepository } from './warehouse-analytics.repository';
import { NotFoundException, NotImplementedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../../products/entities/product.entity';
import { Sku } from '../../skus/entities/skus.entity';
import { Stock } from '../../stocks/entities/stock.entity';
import { Movement } from '../../movements/entities/movement.entity';

describe('WarehouseAnalyticsRepository', () => {
  let repository: WarehouseAnalyticsRepository;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(10),
    getRawOne: jest.fn().mockResolvedValue({ sum: '100' }),
    getRawMany: jest.fn().mockResolvedValue([]),
  };

  const mockProductRepo = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
  const mockSkuRepo = { findOne: jest.fn().mockResolvedValue({ id: 'SKU-1' }) };
  const mockStockRepo = { createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder) };
  const mockMovementRepo = { createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder) };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseAnalyticsRepository,
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(Sku), useValue: mockSkuRepo },
        { provide: getRepositoryToken(Stock), useValue: mockStockRepo },
        { provide: getRepositoryToken(Movement), useValue: mockMovementRepo },
      ],
    }).compile();

    repository = await module.resolve<WarehouseAnalyticsRepository>(WarehouseAnalyticsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should throw Error if warehouseId is not set', async () => {
    await expect(repository.getRotationData(1)).rejects.toThrow('Warehouse ID is not set');
    await expect(repository.getTopMovingData(1)).rejects.toThrow('Warehouse ID is not set');
    await expect(repository.getCoverageData('SKU')).rejects.toThrow('Warehouse ID is not set');
  });

  describe('with warehouseId set', () => {
    beforeEach(() => {
      repository.setWarehouseId(5);
    });

    it('should correctly set and get warehouseId', () => {
      expect(repository.getWarehouseId()).toBe(5);
    });

    describe('getRotationData', () => {
      it('should return rotation data', async () => {
        mockQueryBuilder.getRawOne.mockResolvedValueOnce({ sum: '50' }); // exitSum
        mockQueryBuilder.getRawOne.mockResolvedValueOnce({ sum: '100' }); // stockSum

        const data = await repository.getRotationData(10);
        expect(data.productId).toBe(10);
        expect(data.type).toBe('warehouse');
        expect(data.warehouseId).toBe(5);
        expect(data.movements).toBe(10);
        expect(data.rotationRate).toBe(0.5); // 50 / 100
      });

      it('should throw NotFoundException if product not found', async () => {
        mockProductRepo.findOne.mockResolvedValueOnce(null);
        await expect(repository.getRotationData(999)).rejects.toThrow(NotFoundException);
      });
    });

    describe('getTopMovingData', () => {
      it('should return top moving data', async () => {
        mockQueryBuilder.getRawMany.mockResolvedValueOnce([
          { productId: 1, name: 'Prod A', movementCount: '50' }
        ]);
        const data = await repository.getTopMovingData(3);
        expect(data.length).toBe(1);
        expect(data[0].type).toBe('warehouse');
        expect(data[0].warehouseId).toBe(5);
        expect(data[0].movementCount).toBe(50);
      });
    });

    describe('getCoverageData', () => {
      it('should return coverage data', async () => {
        mockQueryBuilder.getRawOne.mockResolvedValueOnce({ sum: '300' }); // stock quantity
        mockQueryBuilder.getRawOne.mockResolvedValueOnce({ sum: '150' }); // exit sum 30 days
        
        const data = await repository.getCoverageData('SKU-123');
        expect(data.skuId).toBe('SKU-123');
        expect(data.stockQuantity).toBe(300);
        expect(data.avgDailyConsumption).toBe(5); // 150 / 30
        expect(data.type).toBe('warehouse');
        expect(data.warehouseId).toBe(5);
      });

      it('should throw NotFoundException if SKU not found', async () => {
        mockSkuRepo.findOne.mockResolvedValueOnce(null);
        await expect(repository.getCoverageData('INVALID-SKU')).rejects.toThrow(NotFoundException);
      });
    });

    describe('getNeedReorderData', () => {
      it('should throw NotImplementedException', async () => {
        await expect(repository.getNeedReorderData()).rejects.toThrow(NotImplementedException);
      });
    });
  });
});
