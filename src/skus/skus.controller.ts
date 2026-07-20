import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SkusService } from './skus.service';
import { CreateSkusDto } from './dto/create-skus.dto';
import { UpdateSkusDto } from './dto/update-skus.dto';

@Controller('skus')
export class SkusController {
  constructor(private readonly skusService: SkusService) {}

  @Post()
  create(@Body() createSkusDto: CreateSkusDto) {
    return this.skusService.create(createSkusDto);
  }

  @Get()
  findAll() {
    return this.skusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.skusService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSkusDto: UpdateSkusDto) {
    return this.skusService.update(+id, updateSkusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.skusService.remove(+id);
  }
}
