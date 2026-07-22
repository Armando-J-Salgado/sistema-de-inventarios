import { Module } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { MovementsController } from './movements.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movement } from './entities/movement.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Sku } from 'src/skus/entities/skus.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { MovementStrategyFactory } from 'src/factories/movement-strategy.factory';
import { EntranceMovementStrategy } from 'src/strategies/entrance-movement.strategy';
import { IssueMovementStrategy } from 'src/strategies/issue-movement.strategy';
import { MovementEntityResolverService } from './support/movement-entity-resolver.service';
import { ProductVariant } from 'src/product-variants/entities/product-variant.entity';
import { StockAllocationService } from './support/stock-allocation.service';
import { ReceiveTransferStrategy } from 'src/strategies/receive-transfer.strategy';
import { TransferFromReservationStrategy } from 'src/strategies/transfer-from-reservation.strategy';
import { TransferMovementStrategy } from 'src/strategies/transfer-movement.strategy';
import { IssueFromReservationStrategy } from 'src/strategies/issue-from-reservation.strategy';

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
