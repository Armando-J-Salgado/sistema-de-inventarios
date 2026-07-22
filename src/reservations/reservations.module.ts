import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { StocksModule } from 'src/stocks/stocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Stock, Movement]),
    StocksModule
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
