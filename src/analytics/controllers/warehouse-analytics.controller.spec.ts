import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseAnalyticsController } from './warehouse-analytics.controller';
import { WarehouseAnalyticsRepository } from '../repositories/warehouse-analytics.repository';
import { RotationCalculator } from '../calculators/rotation.calculator';
import { CoverageCalculator } from '../calculators/coverage.calculator';
import { TopMovingCalculator } from '../calculators/top-moving.calculator';
import { ExecutionContext } from '@nestjs/common';
import { WarehouseAccessGuard } from '../guards/warehouse-access.guard';

describe('WarehouseAnalyticsController', () => {
  let controller: WarehouseAnalyticsController;

  const mockRotationCalculator = {
    calculate: jest.fn().mockResolvedValue({ rotation: 5 }),
  };
  const mockCoverageCalculator = {
    calculate: jest.fn().mockResolvedValue({ coverageDays: 10 }),
  };
  const mockTopMovingCalculator = {
    calculate: jest.fn().mockResolvedValue([{ productId: 1 }]),
  };
  const mockWarehouseRepository = {
    setWarehouseId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseAnalyticsController],
      providers: [
        { provide: WarehouseAnalyticsRepository, useValue: mockWarehouseRepository },
        { provide: RotationCalculator, useValue: mockRotationCalculator },
        { provide: CoverageCalculator, useValue: mockCoverageCalculator },
        { provide: TopMovingCalculator, useValue: mockTopMovingCalculator },
      ],
    })
    .overrideGuard(WarehouseAccessGuard)
    .useValue({ canActivate: (context: ExecutionContext) => true })
    .compile();

    controller = module.get<WarehouseAnalyticsController>(WarehouseAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call rotationCalculator with warehouse repository after setting warehouseId', async () => {
    await controller.getRotation(5, 10);
    expect(mockWarehouseRepository.setWarehouseId).toHaveBeenCalledWith(5);
    expect(mockRotationCalculator.calculate).toHaveBeenCalledWith(10, mockWarehouseRepository);
  });

  it('should call topMovingCalculator with warehouse repository after setting warehouseId', async () => {
    await controller.getTopMoving(5, 3);
    expect(mockWarehouseRepository.setWarehouseId).toHaveBeenCalledWith(5);
    expect(mockTopMovingCalculator.calculate).toHaveBeenCalledWith(mockWarehouseRepository, 3);
  });

  it('should call coverageCalculator with warehouse repository after setting warehouseId', async () => {
    await controller.getCoverage(5, 'SKU-1');
    expect(mockWarehouseRepository.setWarehouseId).toHaveBeenCalledWith(5);
    expect(mockCoverageCalculator.calculate).toHaveBeenCalledWith('SKU-1', mockWarehouseRepository);
  });
});
