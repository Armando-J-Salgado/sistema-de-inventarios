import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'The reservation has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Insufficient stock or invalid data.' })
  create(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.create(createReservationDto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'List of all reservations.' })
  findAll() {
    return this.reservationsService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: 200, description: 'The found reservation.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(+id);
  }

  @Put(':id')
  @ApiResponse({ status: 200, description: 'The reservation has been successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request. Invalid state transition or insufficient stock.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  update(@Param('id') id: string, @Body() updateReservationDto: UpdateReservationDto) {
    return this.reservationsService.update(+id, updateReservationDto);
  }

  @Delete(':id')
  @ApiResponse({ status: 200, description: 'The reservation has been successfully removed.' })
  @ApiResponse({ status: 404, description: 'Reservation not found.' })
  remove(@Param('id') id: string) {
    return this.reservationsService.remove(+id);
  }
}
