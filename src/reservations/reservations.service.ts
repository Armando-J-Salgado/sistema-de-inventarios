import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Repository } from 'typeorm';
import { StocksService } from '../stocks/stocks.service';
import { ReservationStatus } from './enums/reservation-status.enum';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly stocksService: StocksService,
  ) {}

  async create(createReservationDto: CreateReservationDto) {
    const available = await this.stocksService.getAvailable(createReservationDto.sourceStockId);
    if (available < createReservationDto.quantity) {
      throw new BadRequestException(`Insufficient stock. Requested: ${createReservationDto.quantity}, Available: ${available}`);
    }

    const reservation = this.reservationRepository.create({
      stock: { id: createReservationDto.sourceStockId },
      quantity: createReservationDto.quantity,
      fromDate: new Date(createReservationDto.fromDate),
      toDate: new Date(createReservationDto.toDate),
      status: ReservationStatus.ACTIVE,
    });

    return await this.reservationRepository.save(reservation);
  }

  async findAll() {
    return await this.reservationRepository.find({ relations: ['stock'] });
  }

  async findOne(id: number) {
    const reservation = await this.reservationRepository.findOne({ where: { id }, relations: ['stock'] });
    if (!reservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }
    return reservation;
  }

  async update(id: number, updateReservationDto: UpdateReservationDto) {
    const reservation = await this.findOne(id);

    if (reservation.status === ReservationStatus.COMPLETED || reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update a reservation in ${reservation.status} status`);
    }

    if (updateReservationDto.quantity && updateReservationDto.quantity > reservation.quantity) {
      const extraNeeded = updateReservationDto.quantity - reservation.quantity;
      const available = await this.stocksService.getAvailable(reservation.stock.id);
      
      if (available < extraNeeded) {
        throw new BadRequestException(`Insufficient stock to increase reservation. Extra needed: ${extraNeeded}, Available: ${available}`);
      }
    }

    Object.assign(reservation, updateReservationDto);
    
    if (updateReservationDto.fromDate) {
      reservation.fromDate = new Date(updateReservationDto.fromDate);
    }
    if (updateReservationDto.toDate) {
      reservation.toDate = new Date(updateReservationDto.toDate);
    }

    return await this.reservationRepository.save(reservation);
  }

  async remove(id: number) {
    const reservation = await this.findOne(id);
    reservation.status = ReservationStatus.CANCELLED as string;
    await this.reservationRepository.save(reservation);
    return await this.reservationRepository.softRemove(reservation);
  }
}
