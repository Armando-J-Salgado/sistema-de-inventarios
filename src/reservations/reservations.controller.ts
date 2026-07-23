import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';
import { Roles } from '../jwt/roles/roles.decorator';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Roles('ADMINISTRATOR', 'WAREHOUSE_MANAGER')
  @Post()
  @ApiResponse({ status: 201, description: 'The reservation has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Insufficient stock or invalid data.' })
  create(@Body() createReservationDto: CreateReservationDto, @Req() req: any) {
    return this.reservationsService.create(createReservationDto, req.user);
  }

  @Roles('ADMINISTRATOR', 'ANALYST', 'WAREHOUSE_MANAGER')
  @Get()
  @ApiResponse({ status: 200, description: 'List of all reservations.' })
  findAll(@Req() req: any) {
    return this.reservationsService.findAll(req.user);
  }

  @Roles('ADMINISTRATOR', 'ANALYST', 'WAREHOUSE_MANAGER')
  @Get(':id')
  @ApiResponse({ status: 200, description: 'The found reservation.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.reservationsService.findOne(+id, req.user);
  }

  @Roles('ADMINISTRATOR', 'WAREHOUSE_MANAGER')
  @Put(':id')
  @ApiResponse({ status: 200, description: 'The reservation has been successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid state transition or insufficient stock.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  update(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto, @Req() req: any) {
    return this.reservationsService.update(+id, updateReservationDto, req.user);
  }

  @Roles('ADMINISTRATOR', 'WAREHOUSE_MANAGER')
  @Delete(':id')
  @ApiResponse({ status: 200, description: 'The reservation has been successfully removed.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.reservationsService.remove(+id, req.user);
  }
}
