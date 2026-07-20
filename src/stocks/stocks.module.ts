import { Module } from '@nestjs/common';
import { StocksService } from './stocks.service';
import { StocksController } from './stocks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stock } from './entities/stock.entity';
import { Sku } from 'src/skus/entities/skus.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Movement } from 'src/movements/entities/movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stock, Sku, Warehouse, Reservation, Movement])],
  controllers: [StocksController],
  providers: [StocksService],
})
export class StocksModule {}
