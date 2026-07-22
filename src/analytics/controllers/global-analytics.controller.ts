import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { GlobalAnalyticsRepository } from '../repositories/global-analytics.repository';
import { RotationCalculator } from '../calculators/rotation.calculator';
import { CoverageCalculator } from '../calculators/coverage.calculator';
import { TopMovingCalculator } from '../calculators/top-moving.calculator';
import { Roles } from '../../jwt/roles/roles.decorator';
import { RolesGuard } from '../../jwt/roles/roles.guard';
import { JwtAuthGuard } from '../../jwt/jwt.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATOR', 'ANALYST')
export class GlobalAnalyticsController {
  constructor(
    private readonly globalAnalyticsRepository: GlobalAnalyticsRepository,
    private readonly rotationCalculator: RotationCalculator,
    private readonly coverageCalculator: CoverageCalculator,
    private readonly topMovingCalculator: TopMovingCalculator,
  ) {}

  @Get('rotation/:productId')
  getRotation(@Param('productId', ParseIntPipe) productId: number) {
    return this.rotationCalculator.calculate(productId, this.globalAnalyticsRepository);
  }

  @Get('top-moving')
  getTopMoving(@Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number) {
    return this.topMovingCalculator.calculate(this.globalAnalyticsRepository, limit);
  }

  @Get('coverage/:skuId')
  getCoverage(@Param('skuId') skuId: string) {
    return this.coverageCalculator.calculate(skuId, this.globalAnalyticsRepository);
  }
}
