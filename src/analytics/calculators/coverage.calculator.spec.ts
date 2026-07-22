import { Test, TestingModule } from '@nestjs/testing';
import { CoverageCalculator } from './coverage.calculator';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

describe('CoverageCalculator', () => {
  let calculator: CoverageCalculator;

  const mockRepository: IAnalyticsRepository = {
    getRotationData: jest.fn(),
    getTopMovingData: jest.fn(),
    getCoverageData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoverageCalculator],
    }).compile();

    calculator = module.get<CoverageCalculator>(CoverageCalculator);
  });

  it('should be defined', () => {
    expect(calculator).toBeDefined();
  });

  it('should calculate coverage days correctly based on repository data', async () => {
    (mockRepository.getCoverageData as jest.Mock).mockResolvedValue({
      skuId: 'SKU-1',
      stockQuantity: 150,
      avgDailyConsumption: 10,
      type: 'mock'
    });

    const result = await calculator.calculate('SKU-1', mockRepository);
    
    expect(mockRepository.getCoverageData).toHaveBeenCalledWith('SKU-1');
    expect(result.skuId).toBe('SKU-1');
    expect(result.coverageDays).toBe(15);
    expect(result.dataSource).toBe('mock');
  });

  it('should return 0 coverage days if daily consumption is 0', async () => {
    (mockRepository.getCoverageData as jest.Mock).mockResolvedValue({
      skuId: 'SKU-2',
      stockQuantity: 150,
      avgDailyConsumption: 0,
      type: 'mock'
    });

    const result = await calculator.calculate('SKU-2', mockRepository);
    expect(result.coverageDays).toBe(0);
  });
});
