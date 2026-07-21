import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/jwt/roles/roles.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { RolesGuard } from 'src/jwt/roles/roles.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@Roles('ADMINISTRATOR', 'ANALYST')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Calculate the rotation of a product' })
  @ApiParam({ name: 'productId', type: Number, description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Rotation value calculated correctly' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Get('rotation/:productId')
  calculateRotation(@Param('productId') productId: string) {
    return this.analyticsService.calculateRotation(+productId);
  }

  @ApiOperation({ summary: 'List the top moving products' })
  @ApiResponse({ status: 200, description: 'List of top moving products' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Get('top-moving')
  topMovingProducts() {
    return this.analyticsService.topMovingProducts();
  }

  @ApiOperation({ summary: 'Calculate the coverage days of a SKU' })
  @ApiParam({ name: 'skuId', type: String, description: 'SKU ID' })
  @ApiResponse({ status: 200, description: 'Coverage days calculated correctly' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Get('coverage/:skuId')
  coverageDays(@Param('skuId') skuId: string) {
    return this.analyticsService.coverageDays(skuId);
  }
}
