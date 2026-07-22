import { Test, TestingModule } from '@nestjs/testing';
import { TopMovingCalculator } from './top-moving.calculator';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

describe('TopMovingCalculator', () => {
  let calculator: TopMovingCalculator;

  const mockRepository: IAnalyticsRepository = {
    getRotationData: jest.fn(),
    getTopMovingData: jest.fn(),
    getCoverageData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TopMovingCalculator],
    }).compile();

    calculator = module.get<TopMovingCalculator>(TopMovingCalculator);
  });

  it('should be defined', () => {
    expect(calculator).toBeDefined();
  });

  it('should calculate and rank top moving products based on repository data with default limit', async () => {
    (mockRepository.getTopMovingData as jest.Mock).mockResolvedValue([
      { productId: 1, movementCount: 50, type: 'mock' },
      { productId: 2, movementCount: 150, type: 'mock' },
      { productId: 3, movementCount: 100, type: 'mock' },
    ]);

    const result = await calculator.calculate(mockRepository);
    
    expect(mockRepository.getTopMovingData).toHaveBeenCalledWith(5);
    expect(result.length).toBe(3);
    
    expect(result[0].productId).toBe(2);
    expect(result[0].rank).toBe(1);
    expect(result[1].productId).toBe(3);
    expect(result[1].rank).toBe(2);
    expect(result[2].productId).toBe(1);
    expect(result[2].rank).toBe(3);
  });

  it('should calculate and rank top moving products based on custom limit', async () => {
    (mockRepository.getTopMovingData as jest.Mock).mockResolvedValue([
      { productId: 2, movementCount: 150, type: 'mock' },
      { productId: 3, movementCount: 100, type: 'mock' },
    ]);

    const result = await calculator.calculate(mockRepository, 2);
    
    expect(mockRepository.getTopMovingData).toHaveBeenCalledWith(2);
    expect(result.length).toBe(2);
  });
});
