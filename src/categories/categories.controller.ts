import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../jwt/roles/roles.decorator';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({summary: 'Create a category'})
  @ApiResponse({status: 201, description: 'New category created successfully'})
  @ApiResponse({status: 400, description: 'Invalid argument exception. Missing fields'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @ApiResponse({status: 403, description: 'Not authorized'})
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }


  @ApiOperation({summary: 'Find all categories'})
  @ApiQuery({name: 'active', type: String, description: 'Filters active and inactive categories', required: false})
  @ApiResponse({status: 200, description: 'List of categories'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('active') active: string) {
    const filter = active === undefined ? undefined : active.toLowerCase() === 'true' ? true : active.toLowerCase() === 'false' ? false : undefined
    return this.categoriesService.findAll(filter);
  }

  @ApiOperation({summary: 'Get an specific category'})
  @ApiParam({name: 'id', type: Number, description: 'Category ID'})
  @ApiResponse({status: 200, description: 'Category found correctly'})
  @ApiResponse({status: 404, description: 'Category not found'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @ApiOperation({summary: 'Update an specific category'})
  @ApiParam({name: 'id', type: Number, description: 'Category ID'})
  @ApiResponse({status: 200, description: 'Category updated correctly'})
  @ApiResponse({status: 404, description: 'Category not found'})
  @ApiResponse({status: 400, description: 'Invalid arguments exception. Missing or unappropiate fields'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @ApiResponse({status: 403, description: 'Not authorized'})
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @ApiOperation({summary: 'Soft delete an specific category'})
  @ApiParam({name: 'id', type: Number, description: 'Category ID'})
  @ApiResponse({status: 203, description: 'Category deleted correctly'})
  @ApiResponse({status: 404, description: 'Category not found'})
  @ApiResponse({status: 401, description: 'Not authenthicated'})
  @ApiResponse({status: 403, description: 'Not authorized'})
  @Roles('ADMINISTRATOR')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}
