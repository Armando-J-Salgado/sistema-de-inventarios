import { Injectable } from '@nestjs/common';
import { GlobalAnalyticsRepository } from './repositories/global-analytics.repository';
import { WarehouseAnalyticsRepository } from './repositories/warehouse-analytics.repository';
import { RotationCalculator } from './calculators/rotation.calculator';
import { TopMovingCalculator } from './calculators/top-moving.calculator';
import { CoverageCalculator } from './calculators/coverage.calculator';
import { NeedReorderCalculator } from './calculators/need-reorder.calculator';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly globalRepo: GlobalAnalyticsRepository,
    private readonly warehouseRepo: WarehouseAnalyticsRepository,
    private readonly rotationCalculator: RotationCalculator,
    private readonly topMovingCalculator: TopMovingCalculator,
    private readonly coverageCalculator: CoverageCalculator,
    private readonly needReorderCalculator: NeedReorderCalculator,
  ) {}

  // --- Global Analytics ---

  async getGlobalRotation(productId: number) {
    return this.rotationCalculator.calculate(productId, this.globalRepo);
  }

  async getGlobalTopMoving(limit: number = 5) {
    return this.topMovingCalculator.calculate(this.globalRepo, limit);
  }

  async getGlobalCoverage(skuId: string) {
    return this.coverageCalculator.calculate(skuId, this.globalRepo);
  }

  async getGlobalNeedReorder() {
    return this.needReorderCalculator.calculate(this.globalRepo);
  }

  // --- Warehouse Specific Analytics ---

  async getWarehouseRotation(warehouseId: number, productId: number) {
    this.warehouseRepo.setWarehouseId(warehouseId);
    return this.rotationCalculator.calculate(productId, this.warehouseRepo);
  }

  async getWarehouseTopMoving(warehouseId: number, limit: number = 5) {
    this.warehouseRepo.setWarehouseId(warehouseId);
    return this.topMovingCalculator.calculate(this.warehouseRepo, limit);
  }

  async getWarehouseCoverage(warehouseId: number, skuId: string) {
    this.warehouseRepo.setWarehouseId(warehouseId);
    return this.coverageCalculator.calculate(skuId, this.warehouseRepo);
  }
}
