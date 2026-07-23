import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LotsService } from './lots.service';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { LotQueryDto } from './dto/lot-query.dto';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';
import { Roles } from '../jwt/roles/roles.decorator';

@ApiTags('lots')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@Controller('lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a lot' })
  @ApiResponse({ status: 201, description: 'Lot created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @Post()
  create(@Body() createLotDto: CreateLotDto) {
    return this.lotsService.create(createLotDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get lots with optional filters' })
  @ApiQuery({ name: 'providerId', required: false, type: Number, description: 'Filter by provider id' })
  @ApiQuery({ name: 'state', required: false, enum: ['PENDING', 'RECEIVED', 'CLOSED'], description: 'Filter by lot state' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Filter by active flag' })
  @ApiResponse({ status: 200, description: 'Lots retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(@Query() query: LotQueryDto) {
    return this.lotsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a lot by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Lot id' })
  @ApiResponse({ status: 200, description: 'Lot retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Lot not found' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lotsService.findOne(id);
  }

  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Update a lot' })
  @ApiParam({ name: 'id', type: Number, description: 'Lot id' })
  @ApiResponse({ status: 200, description: 'Lot updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Lot or provider not found' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLotDto: UpdateLotDto) {
    return this.lotsService.update(id, updateLotDto);
  }

  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Deactivate a lot' })
  @ApiParam({ name: 'id', type: Number, description: 'Lot id' })
  @ApiResponse({ status: 200, description: 'Lot deactivated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Lot not found' })
  @ApiResponse({ status: 409, description: 'Conflict with associated skus' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lotsService.remove(id);
  }
}
