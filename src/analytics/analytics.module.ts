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
import { Movement } from '../movements/entities/movement.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { Sku } from '../skus/entities/skus.entity';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse, 
      Movement, 
      Stock, 
      Sku, 
      ProductVariant, 
      Product
    ]),
  ],
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
