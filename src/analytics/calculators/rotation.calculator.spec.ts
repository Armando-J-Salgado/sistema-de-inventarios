import { Test, TestingModule } from '@nestjs/testing';
import { RotationCalculator } from './rotation.calculator';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

describe('RotationCalculator', () => {
  let calculator: RotationCalculator;

  const mockRepository: IAnalyticsRepository = {
    getRotationData: jest.fn(),
    getTopMovingData: jest.fn(),
    getCoverageData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RotationCalculator],
    }).compile();

    calculator = module.get<RotationCalculator>(RotationCalculator);
  });

  it('should be defined', () => {
    expect(calculator).toBeDefined();
  });

  it('should calculate rotation correctly based on repository data', async () => {
    (mockRepository.getRotationData as jest.Mock).mockResolvedValue({
      productId: 10,
      rotationRate: 2,
      movements: 10,
      type: 'mock'
    });

    const result = await calculator.calculate(10, mockRepository);
    
    expect(mockRepository.getRotationData).toHaveBeenCalledWith(10);
    expect(result.productId).toBe(10);
    expect(result.rotation).toBe(3); // 2 * 1.5
    expect(result.dataSource).toBe('mock');
  });

  it('should return 0 rotation if no movements', async () => {
    (mockRepository.getRotationData as jest.Mock).mockResolvedValue({
      productId: 10,
      rotationRate: 2,
      movements: 0,
      type: 'mock'
    });

    const result = await calculator.calculate(10, mockRepository);
    expect(result.rotation).toBe(0);
  });
});
