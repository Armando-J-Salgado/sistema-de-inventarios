import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { GlobalAnalyticsRepository } from './repositories/global-analytics.repository';
import { WarehouseAnalyticsRepository } from './repositories/warehouse-analytics.repository';
import { RotationCalculator } from './calculators/rotation.calculator';
import { TopMovingCalculator } from './calculators/top-moving.calculator';
import { CoverageCalculator } from './calculators/coverage.calculator';
import { NeedReorderCalculator } from './calculators/need-reorder.calculator';

describe('AnalyticsService (Facade)', () => {
  let service: AnalyticsService;

  const mockGlobalRepo = {};
  const mockWarehouseRepo = { setWarehouseId: jest.fn() };
  
  const mockRotationCalc = { calculate: jest.fn().mockResolvedValue('rotation_res') };
  const mockTopMovingCalc = { calculate: jest.fn().mockResolvedValue('top_moving_res') };
  const mockCoverageCalc = { calculate: jest.fn().mockResolvedValue('coverage_res') };
  const mockNeedReorderCalc = { calculate: jest.fn().mockResolvedValue('need_reorder_res') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: GlobalAnalyticsRepository, useValue: mockGlobalRepo },
        { provide: WarehouseAnalyticsRepository, useValue: mockWarehouseRepo },
        { provide: RotationCalculator, useValue: mockRotationCalc },
        { provide: TopMovingCalculator, useValue: mockTopMovingCalc },
        { provide: CoverageCalculator, useValue: mockCoverageCalc },
        { provide: NeedReorderCalculator, useValue: mockNeedReorderCalc },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Global Operations', () => {
    it('should call getGlobalRotation correctly', async () => {
      const res = await service.getGlobalRotation(1);
      expect(mockRotationCalc.calculate).toHaveBeenCalledWith(1, mockGlobalRepo);
      expect(res).toBe('rotation_res');
    });

    it('should call getGlobalTopMoving correctly', async () => {
      const res = await service.getGlobalTopMoving(3);
      expect(mockTopMovingCalc.calculate).toHaveBeenCalledWith(mockGlobalRepo, 3);
      expect(res).toBe('top_moving_res');
    });

    it('should call getGlobalCoverage correctly', async () => {
      const res = await service.getGlobalCoverage('SKU1');
      expect(mockCoverageCalc.calculate).toHaveBeenCalledWith('SKU1', mockGlobalRepo);
      expect(res).toBe('coverage_res');
    });

    it('should call getGlobalNeedReorder correctly', async () => {
      const res = await service.getGlobalNeedReorder();
      expect(mockNeedReorderCalc.calculate).toHaveBeenCalledWith(mockGlobalRepo);
      expect(res).toBe('need_reorder_res');
    });
  });

  describe('Warehouse Operations', () => {
    it('should call getWarehouseRotation correctly after setting warehouseId', async () => {
      const res = await service.getWarehouseRotation(5, 1);
      expect(mockWarehouseRepo.setWarehouseId).toHaveBeenCalledWith(5);
      expect(mockRotationCalc.calculate).toHaveBeenCalledWith(1, mockWarehouseRepo);
      expect(res).toBe('rotation_res');
    });

    it('should call getWarehouseTopMoving correctly after setting warehouseId', async () => {
      const res = await service.getWarehouseTopMoving(5, 3);
      expect(mockWarehouseRepo.setWarehouseId).toHaveBeenCalledWith(5);
      expect(mockTopMovingCalc.calculate).toHaveBeenCalledWith(mockWarehouseRepo, 3);
      expect(res).toBe('top_moving_res');
    });

    it('should call getWarehouseCoverage correctly after setting warehouseId', async () => {
      const res = await service.getWarehouseCoverage(5, 'SKU1');
      expect(mockWarehouseRepo.setWarehouseId).toHaveBeenCalledWith(5);
      expect(mockCoverageCalc.calculate).toHaveBeenCalledWith('SKU1', mockWarehouseRepo);
      expect(res).toBe('coverage_res');
    });
  });
});
