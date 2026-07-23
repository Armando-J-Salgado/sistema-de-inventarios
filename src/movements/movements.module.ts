import { Module } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement } from './entities/movement.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { Sku } from '../skus/entities/skus.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Employee } from '../employees/entities/employee.entity';
import { MovementStrategyFactory } from '../factories/movement-strategy.factory';
import { EntranceMovementStrategy } from '../strategies/entrance-movement.strategy';
import { IssueMovementStrategy } from '../strategies/issue-movement.strategy';
import { MovementEntityResolverService } from './support/movement-entity-resolver.service';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { StockAllocationService } from './support/stock-allocation.service';
import { ReceiveTransferStrategy } from '../strategies/receive-transfer.strategy';
import { TransferFromReservationStrategy } from '../strategies/transfer-from-reservation.strategy';
import { TransferMovementStrategy } from '../strategies/transfer-movement.strategy';
import { IssueFromReservationStrategy } from '../strategies/issue-from-reservation.strategy';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movement,
      Sku,
      Warehouse,
      Employee,
      Stock,
      Reservation,
      ProductVariant,
    ]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [MovementsController],
  providers: [
    MovementsService,
    MovementStrategyFactory,
    EntranceMovementStrategy,
    IssueMovementStrategy,
    MovementEntityResolverService,
    StockAllocationService,
    ReceiveTransferStrategy,
    TransferFromReservationStrategy,
    TransferMovementStrategy,
    IssueFromReservationStrategy,
  ],
  exports: [MovementsService],
})
export class MovementsModule {}
