import { Controller, Get, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StocksService } from './stocks.service';
import { UpdateStockDto } from './dto/update-stock.dto';
import { GetAvailableQueryDto } from './dto/get-available-query.dto';
import { Roles } from '../jwt/roles/roles.decorator';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';

@ApiTags('stocks')
@ApiBearerAuth()
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @ApiOperation({ summary: 'Find all stocks' })
  @ApiResponse({ status: 200, description: 'List of stocks' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.stocksService.findAll();
  }

  @ApiOperation({ summary: 'Real-time available stock for a product variant (quantity minus active reservations), optionally scoped to one warehouse' })
  @ApiQuery({ name: 'variantId', type: Number, description: 'Product variant ID', required: true })
  @ApiQuery({ name: 'warehouseId', type: Number, description: 'Warehouse ID', required: false })
  @ApiResponse({ status: 200, description: 'Total available quantity' })
  @ApiResponse({ status: 400, description: 'Invalid argument exception. variantId/warehouseId must be numeric' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get('available')
  getAvailableByVariantWarehouse(@Query() query: GetAvailableQueryDto) {
    return this.stocksService.getAvailableByVariantWarehouse(query.variantId, query.warehouseId);
  }

  @ApiOperation({ summary: 'Get a specific stock' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock ID' })
  @ApiResponse({ status: 200, description: 'Stock found correctly' })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stocksService.findOne(+id);
  }

  @ApiOperation({ summary: 'Real-time available quantity for this stock row (quantity minus its active reservations)' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock ID' })
  @ApiResponse({ status: 200, description: 'Available quantity, never negative' })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get(':id/available')
  getAvailable(@Param('id') id: string) {
    return this.stocksService.getAvailable(+id);
  }

  @ApiOperation({ summary: 'Update a specific stock' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock ID' })
  @ApiResponse({ status: 200, description: 'Stock updated correctly' })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  @ApiResponse({ status: 400, description: 'Invalid arguments exception. Missing or inappropriate fields' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
    return this.stocksService.update(+id, updateStockDto);
  }

  @ApiOperation({ summary: 'Soft delete a stock row (extraordinary write-off: contamination, warehouse incident, staff-attributable loss). Not the normal exit flow, see MovementService.createExit' })
  @ApiParam({ name: 'id', type: Number, description: 'Stock ID' })
  @ApiResponse({ status: 203, description: 'Stock deleted correctly' })
  @ApiResponse({ status: 404, description: 'Stock not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.stocksService.remove(+id);
  }
}
