import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @ApiOperation({ summary: 'Find all alerts (auto-generated, read-only)' })
  @ApiResponse({ status: 200, description: 'List of alerts' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.alertsService.findAll();
  }

  @ApiOperation({ summary: 'Get a specific alert' })
  @ApiParam({ name: 'id', type: Number, description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert found correctly' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alertsService.findOne(+id);
  }
}
