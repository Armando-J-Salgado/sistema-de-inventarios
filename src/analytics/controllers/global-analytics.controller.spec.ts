import { Test, TestingModule } from '@nestjs/testing';
import { GlobalAnalyticsController } from './global-analytics.controller';
import { GlobalAnalyticsRepository } from '../repositories/global-analytics.repository';
import { RotationCalculator } from '../calculators/rotation.calculator';
import { CoverageCalculator } from '../calculators/coverage.calculator';
import { TopMovingCalculator } from '../calculators/top-moving.calculator';

describe('GlobalAnalyticsController', () => {
  let controller: GlobalAnalyticsController;

  const mockRotationCalculator = {
    calculate: jest.fn().mockResolvedValue({ rotation: 5 }),
  };
  const mockCoverageCalculator = {
    calculate: jest.fn().mockResolvedValue({ coverageDays: 10 }),
  };
  const mockTopMovingCalculator = {
    calculate: jest.fn().mockResolvedValue([{ productId: 1 }]),
  };
  const mockGlobalRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GlobalAnalyticsController],
      providers: [
        { provide: GlobalAnalyticsRepository, useValue: mockGlobalRepository },
        { provide: RotationCalculator, useValue: mockRotationCalculator },
        { provide: CoverageCalculator, useValue: mockCoverageCalculator },
        { provide: TopMovingCalculator, useValue: mockTopMovingCalculator },
      ],
    }).compile();

    controller = module.get<GlobalAnalyticsController>(GlobalAnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call rotationCalculator with global repository', async () => {
    await controller.getRotation(10);
    expect(mockRotationCalculator.calculate).toHaveBeenCalledWith(10, mockGlobalRepository);
  });

  it('should call topMovingCalculator with global repository and limit', async () => {
    await controller.getTopMoving(3);
    expect(mockTopMovingCalculator.calculate).toHaveBeenCalledWith(mockGlobalRepository, 3);
  });

  it('should call coverageCalculator with global repository', async () => {
    await controller.getCoverage('SKU-1');
    expect(mockCoverageCalculator.calculate).toHaveBeenCalledWith('SKU-1', mockGlobalRepository);
  });
});
