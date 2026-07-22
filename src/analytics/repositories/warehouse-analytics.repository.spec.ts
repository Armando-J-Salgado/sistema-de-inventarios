import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseAnalyticsRepository } from './warehouse-analytics.repository';
import { NotFoundException, NotImplementedException } from '@nestjs/common';

describe('WarehouseAnalyticsRepository', () => {
  let repository: WarehouseAnalyticsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WarehouseAnalyticsRepository],
    }).compile();

    repository = await module.resolve<WarehouseAnalyticsRepository>(WarehouseAnalyticsRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should throw error if warehouseId is not set', async () => {
    await expect(repository.getRotationData(10)).rejects.toThrow('Warehouse ID is not set');
  });

  it('should return mock rotation data for specific warehouse for valid product', async () => {
    repository.setWarehouseId(5);
    const data = await repository.getRotationData(10);
    expect(data.productId).toBe(10);
    expect(data.warehouseId).toBe(5);
    expect(data.type).toBe('warehouse');
  });

  it('should throw NotFoundException for invalid product in rotation data', async () => {
    repository.setWarehouseId(5);
    await expect(repository.getRotationData(999)).rejects.toThrow(NotFoundException);
  });

  it('should return mock top moving data for specific warehouse limited by param', async () => {
    repository.setWarehouseId(5);
    const data = await repository.getTopMovingData(2);
    expect(data.length).toBe(2);
    expect(data[0].warehouseId).toBe(5);
    expect(data[0].type).toBe('warehouse');
  });

  it('should return mock coverage data for specific warehouse for valid SKU', async () => {
    repository.setWarehouseId(5);
    const data = await repository.getCoverageData('SKU-123');
    expect(data.skuId).toBe('SKU-123');
    expect(data.warehouseId).toBe(5);
    expect(data.type).toBe('warehouse');
  });

  it('should throw NotFoundException for invalid SKU in coverage data', async () => {
    repository.setWarehouseId(5);
    await expect(repository.getCoverageData('INVALID-SKU')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotImplementedException for getNeedReorderData', async () => {
    await expect(repository.getNeedReorderData()).rejects.toThrow(NotImplementedException);
  });
});
