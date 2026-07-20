import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Movement } from 'src/movements/entities/movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Stock, Movement])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
