import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Repository } from 'typeorm';
import { StocksService } from '../stocks/stocks.service';
import { ReservationStatus } from './enums/reservation-status.enum';
import { Stock } from 'src/stocks/entities/stock.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    private readonly stocksService: StocksService,
  ) {}

  async create(createReservationDto: CreateReservationDto, user: any) {
    if (user.roles?.includes('WAREHOUSE_MANAGER')) {
      const stock = await this.stockRepository.findOne({
        where: { id: createReservationDto.sourceStockId },
        relations: ['warehouse', 'warehouse.administrator'],
      });
      if (!stock || stock.warehouse?.administrator?.id !== user.employeeId) {
        throw new ForbiddenException('You can only create reservations for your assigned warehouse');
      }
    }

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

  async findAll(user: any) {
    if (user.roles?.includes('WAREHOUSE_MANAGER')) {
      return await this.reservationRepository.find({
        where: {
          stock: {
            warehouse: {
              administrator: { id: user.employeeId },
            },
          },
        },
        relations: ['stock', 'stock.warehouse', 'stock.warehouse.administrator'],
      });
    }

    return await this.reservationRepository.find({ relations: ['stock'] });
  }

  async findOne(id: number, user: any) {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: ['stock', 'stock.warehouse', 'stock.warehouse.administrator'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation #${id} not found`);
    }

    if (user.roles?.includes('WAREHOUSE_MANAGER')) {
      if (reservation.stock?.warehouse?.administrator?.id !== user.employeeId) {
        throw new ForbiddenException('Access denied to this warehouse reservation');
      }
    }

    return reservation;
  }

  async update(id: number, updateReservationDto: UpdateReservationDto, user: any) {
    const reservation = await this.findOne(id, user);

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

  async remove(id: number, user: any) {
    const reservation = await this.findOne(id, user);
    reservation.status = ReservationStatus.CANCELLED as string;
    await this.reservationRepository.save(reservation);
    return await this.reservationRepository.softRemove(reservation);
  }
}
