import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../jwt/roles/roles.decorator';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';

@ApiTags('warehouses')
@ApiBearerAuth()
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({summary: 'Create a warehouse'})
  @ApiResponse({status: 201, description: 'New warehouse created successfully'})
  @ApiResponse({status: 400, description: 'Invalid arguments exception. Missing or unappropiate fields'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @ApiResponse({status: 403, description: 'Not authorized'})
  @ApiResponse({status: 404, description: 'Administrator employee not found'})
  @ApiResponse({status: 409, description: 'Warehouse name already exists or employee already administrates another warehouse'})
  @Post()
  create(@Body() createWarehouseDto: CreateWarehouseDto) {
    return this.warehousesService.create(createWarehouseDto);
  }

  @ApiOperation({summary: 'Find all warehouses'})
  @ApiQuery({name: 'active', type: String, description: 'Filters active and inactive warehouses', required: false})
  @ApiResponse({status: 200, description: 'List of warehouses'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('active') active: string) {
    const filter = active === undefined ? undefined : active.toLowerCase() === 'true' ? true : active.toLowerCase() === 'false' ? false : undefined
    return this.warehousesService.findAll(filter);
  }

  @ApiOperation({summary: 'Get an specific warehouse'})
  @ApiParam({name: 'id', type: Number, description: 'Warehouse ID'})
  @ApiResponse({status: 200, description: 'Warehouse found correctly'})
  @ApiResponse({status: 404, description: 'Warehouse not found'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(+id);
  }

  @ApiOperation({summary: 'Update an specific warehouse'})
  @ApiParam({name: 'id', type: Number, description: 'Warehouse ID'})
  @ApiResponse({status: 200, description: 'Warehouse updated correctly'})
  @ApiResponse({status: 404, description: 'Warehouse or administrator employee not found'})
  @ApiResponse({status: 400, description: 'Invalid arguments exception. Missing or unappropiate fields'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @ApiResponse({status: 403, description: 'Not authorized'})
  @ApiResponse({status: 409, description: 'Warehouse name already exists or employee already administrates another warehouse'})
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWarehouseDto: UpdateWarehouseDto) {
    return this.warehousesService.update(+id, updateWarehouseDto);
  }

  @ApiOperation({summary: 'Soft delete an specific warehouse'})
  @ApiParam({name: 'id', type: Number, description: 'Warehouse ID'})
  @ApiResponse({status: 200, description: 'Warehouse deleted correctly'})
  @ApiResponse({status: 404, description: 'Warehouse not found'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @ApiResponse({status: 403, description: 'Not authorized'})
  @ApiResponse({status: 409, description: 'Cannot deactivate warehouse with stock on hand'})
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.warehousesService.remove(+id);
  }
}
