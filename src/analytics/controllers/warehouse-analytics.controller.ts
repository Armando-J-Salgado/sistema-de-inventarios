import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { WarehouseAnalyticsRepository } from '../repositories/warehouse-analytics.repository';
import { RotationCalculator } from '../calculators/rotation.calculator';
import { CoverageCalculator } from '../calculators/coverage.calculator';
import { TopMovingCalculator } from '../calculators/top-moving.calculator';
import { Roles } from '../../jwt/roles/roles.decorator';
import { RolesGuard } from '../../jwt/roles/roles.guard';
import { JwtAuthGuard } from '../../jwt/jwt.guard';
import { WarehouseAccessGuard } from '../guards/warehouse-access.guard';

@Controller('warehouses/:warehouseId/analytics')
@UseGuards(JwtAuthGuard, RolesGuard, WarehouseAccessGuard)
@Roles('ADMINISTRATOR', 'ANALYST', 'WAREHOUSE_MANAGER')
export class WarehouseAnalyticsController {
  constructor(
    private readonly warehouseAnalyticsRepository: WarehouseAnalyticsRepository,
    private readonly rotationCalculator: RotationCalculator,
    private readonly coverageCalculator: CoverageCalculator,
    private readonly topMovingCalculator: TopMovingCalculator,
  ) {}

  @Get('rotation/:productId')
  getRotation(
    @Param('warehouseId', ParseIntPipe) warehouseId: number,
    @Param('productId', ParseIntPipe) productId: number
  ) {
    this.warehouseAnalyticsRepository.setWarehouseId(warehouseId);
    return this.rotationCalculator.calculate(productId, this.warehouseAnalyticsRepository);
  }

  @Get('top-moving')
  getTopMoving(
    @Param('warehouseId', ParseIntPipe) warehouseId: number,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number
  ) {
    this.warehouseAnalyticsRepository.setWarehouseId(warehouseId);
    return this.topMovingCalculator.calculate(this.warehouseAnalyticsRepository, limit);
  }

  @Get('coverage/:skuId')
  getCoverage(
    @Param('warehouseId', ParseIntPipe) warehouseId: number,
    @Param('skuId') skuId: string
  ) {
    this.warehouseAnalyticsRepository.setWarehouseId(warehouseId);
    return this.coverageCalculator.calculate(skuId, this.warehouseAnalyticsRepository);
  }
}
