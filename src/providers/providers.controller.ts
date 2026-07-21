import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { Provider } from './entities/provider.entity';

@ApiTags('providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'The provider has been successfully created.', type: Provider })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  create(@Body() createProviderDto: CreateProviderDto) {
    return this.providersService.create(createProviderDto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Returns all providers.', type: [Provider] })
  findAll() {
    return this.providersService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'Returns a single provider.', type: Provider })
  @ApiResponse({ status: 404, description: 'Provider not found.' })
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(+id);
  }

  @Put(':id')
  @ApiResponse({ status: 200, description: 'The provider has been successfully updated.', type: Provider })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 404, description: 'Provider not found.' })
  update(@Param('id') id: string, @Body() updateProviderDto: UpdateProviderDto) {
    return this.providersService.update(+id, updateProviderDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'The provider has been successfully removed.' })
  @ApiResponse({ status: 404, description: 'Provider not found.' })
  remove(@Param('id') id: string) {
    return this.providersService.remove(+id);
  }
}
