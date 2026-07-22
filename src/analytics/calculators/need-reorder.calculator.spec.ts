import { Test, TestingModule } from '@nestjs/testing';
import { NeedReorderCalculator } from './need-reorder.calculator';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

describe('NeedReorderCalculator', () => {
  let calculator: NeedReorderCalculator;

  const mockRepository: IAnalyticsRepository = {
    getRotationData: jest.fn(),
    getTopMovingData: jest.fn(),
    getCoverageData: jest.fn(),
    getNeedReorderData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NeedReorderCalculator],
    }).compile();

    calculator = module.get<NeedReorderCalculator>(NeedReorderCalculator);
  });

  it('should be defined', () => {
    expect(calculator).toBeDefined();
  });

  it('should map and return need reorder data', async () => {
    (mockRepository.getNeedReorderData as jest.Mock).mockResolvedValue([
      { productVariantId: 1, name: 'Variant A', currentStock: 5, reorderPoint: 10, type: 'mock' },
    ]);

    const result = await calculator.calculate(mockRepository);
    
    expect(mockRepository.getNeedReorderData).toHaveBeenCalled();
    expect(result.length).toBe(1);
    expect(result[0].productVariantId).toBe(1);
    expect(result[0].needsReorder).toBe(true);
    expect(result[0].dataSource).toBe('mock');
  });

  it('should return empty array if no data is returned', async () => {
    (mockRepository.getNeedReorderData as jest.Mock).mockResolvedValue([]);

    const result = await calculator.calculate(mockRepository);
    
    expect(mockRepository.getNeedReorderData).toHaveBeenCalled();
    expect(result.length).toBe(0);
  });
});
