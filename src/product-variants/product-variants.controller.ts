import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProductVariantsService } from './product-variants.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { Roles } from '../jwt/roles/roles.decorator';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';

@ApiTags('variants')
@ApiBearerAuth()
@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly productVariantsService: ProductVariantsService) {}

  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Create a product variant' })
  @ApiResponse({ status: 201, description: 'New product variant created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid argument exception. Missing or invalid fields' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Post()
  create(@Body() createProductVariantDto: CreateProductVariantDto) {
    return this.productVariantsService.create(createProductVariantDto);
  }

  @ApiOperation({ summary: 'Find all active product variants' })
  @ApiResponse({ status: 200, description: 'List of product variants' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.productVariantsService.findAll();
  }

  @ApiOperation({ summary: 'Get a specific product variant' })
  @ApiParam({ name: 'id', type: Number, description: 'Product variant ID' })
  @ApiResponse({ status: 200, description: 'Product variant found correctly' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productVariantsService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update a specific product variant' })
  @ApiParam({ name: 'id', type: Number, description: 'Product variant ID' })
  @ApiResponse({ status: 200, description: 'Product variant updated correctly' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  @ApiResponse({ status: 400, description: 'Invalid arguments exception. Missing or inappropriate fields' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductVariantDto: UpdateProductVariantDto) {
    return this.productVariantsService.update(+id, updateProductVariantDto);
  }

  @ApiOperation({ summary: 'Soft delete a specific product variant' })
  @ApiParam({ name: 'id', type: Number, description: 'Product variant ID' })
  @ApiResponse({ status: 203, description: 'Product variant deleted correctly' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productVariantsService.remove(+id);
  }
}
