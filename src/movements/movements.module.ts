import { Module } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement } from './entities/movement.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Stock } from 'src/stocks/entities/stock.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movement, Reservation, Stock])
  ],
  controllers: [MovementsController],
  providers: [MovementsService],
})
export class MovementsModule {}
