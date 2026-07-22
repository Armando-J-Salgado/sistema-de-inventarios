import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalAnalyticsController } from './controllers/global-analytics.controller';
import { WarehouseAnalyticsController } from './controllers/warehouse-analytics.controller';
import { GlobalAnalyticsRepository } from './repositories/global-analytics.repository';
import { WarehouseAnalyticsRepository } from './repositories/warehouse-analytics.repository';
import { RotationCalculator } from './calculators/rotation.calculator';
import { CoverageCalculator } from './calculators/coverage.calculator';
import { TopMovingCalculator } from './calculators/top-moving.calculator';
import { NeedReorderCalculator } from './calculators/need-reorder.calculator';
import { AnalyticsService } from './analytics.service';
import { Warehouse } from '../warehouses/entities/warehouse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse])],
  controllers: [
    GlobalAnalyticsController,
    WarehouseAnalyticsController,
  ],
  providers: [
    GlobalAnalyticsRepository,
    WarehouseAnalyticsRepository,
    RotationCalculator,
    CoverageCalculator,
    TopMovingCalculator,
    NeedReorderCalculator,
    AnalyticsService,
  ],
  exports: [
    GlobalAnalyticsRepository,
    WarehouseAnalyticsRepository,
    RotationCalculator,
    CoverageCalculator,
    TopMovingCalculator,
    NeedReorderCalculator,
    AnalyticsService,
  ],
})
export class AnalyticsModule {}
