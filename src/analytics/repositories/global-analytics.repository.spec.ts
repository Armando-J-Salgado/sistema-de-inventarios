import { Test, TestingModule } from '@nestjs/testing';
import { GlobalAnalyticsRepository } from './global-analytics.repository';
import { NotFoundException } from '@nestjs/common';

describe('GlobalAnalyticsRepository', () => {
  let repository: GlobalAnalyticsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalAnalyticsRepository],
    }).compile();

    repository = module.get<GlobalAnalyticsRepository>(GlobalAnalyticsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should return mock rotation data globally for valid product', async () => {
    const data = await repository.getRotationData(10);
    expect(data.productId).toBe(10);
    expect(data.type).toBe('global');
  });

  it('should throw NotFoundException for invalid product in rotation data', async () => {
    await expect(repository.getRotationData(999)).rejects.toThrow(NotFoundException);
  });

  it('should return mock top moving data globally limited by parameter', async () => {
    const data = await repository.getTopMovingData(3);
    expect(data.length).toBe(3);
    expect(data[0].type).toBe('global');
  });

  it('should return mock coverage data globally for valid SKU', async () => {
    const data = await repository.getCoverageData('SKU-123');
    expect(data.skuId).toBe('SKU-123');
    expect(data.type).toBe('global');
  });

  it('should throw NotFoundException for invalid SKU in coverage data', async () => {
    await expect(repository.getCoverageData('INVALID-SKU')).rejects.toThrow(NotFoundException);
  });
});
