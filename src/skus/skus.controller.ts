import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkusService } from './skus.service';
import { CreateSkusDto } from './dto/create-skus.dto';
import { UpdateSkusDto } from './dto/update-skus.dto';
import { Roles } from 'src/jwt/roles/roles.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { RolesGuard } from 'src/jwt/roles/roles.guard';

@ApiTags('skus')
@ApiBearerAuth()
@Controller('skus')
export class SkusController {
  constructor(private readonly skusService: SkusService) {}

  @ApiOperation({ summary: 'Create an SKU' })
  @ApiResponse({ status: 201, description: 'SKU created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid argument exception. Missing or inappropriate fields' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  create(@Body() createSkusDto: CreateSkusDto) {
    return this.skusService.create(createSkusDto);
  }

  @ApiOperation({ summary: 'Find all SKUs' })
  @ApiQuery({ name: 'active', type: String, description: 'Filters active and inactive SKUs', required: false })
  @ApiResponse({ status: 200, description: 'List of SKUs' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('active') active: string) {
    const filter = active === undefined ? undefined : active.toLowerCase() === 'true' ? true : active.toLowerCase() === 'false' ? false : undefined;
    return this.skusService.findAll(filter);
  }

  @ApiOperation({ summary: 'Get a specific SKU' })
  @ApiParam({ name: 'id', type: String, description: 'SKU ID' })
  @ApiResponse({ status: 200, description: 'SKU found correctly' })
  @ApiResponse({ status: 404, description: 'SKU not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skusService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a specific SKU' })
  @ApiParam({ name: 'id', type: String, description: 'SKU ID' })
  @ApiResponse({ status: 200, description: 'SKU updated correctly' })
  @ApiResponse({ status: 404, description: 'SKU not found' })
  @ApiResponse({ status: 400, description: 'Invalid arguments exception. Missing or inappropriate fields' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSkusDto: UpdateSkusDto) {
    return this.skusService.update(id, updateSkusDto);
  }

  @ApiOperation({ summary: 'Soft delete a specific SKU' })
  @ApiParam({ name: 'id', type: String, description: 'SKU ID' })
  @ApiResponse({ status: 200, description: 'SKU deleted correctly' })
  @ApiResponse({ status: 404, description: 'SKU not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.skusService.remove(id);
  }
}
