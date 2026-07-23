import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Movement } from './entities/movement.entity';
import { MovementStrategyFactory } from '../factories/movement-strategy.factory';
import { Repository } from 'typeorm';
import { CreateEntryDto } from './dto/create-entry.dto';
import { MovementType } from '../enums/movement-type.enum';
import { CreateIssueDto } from './dto/create-issue.dto';
import { TransferMovementDto } from './dto/transfer-movement.dto';
import { TransferFromReservationDto } from './dto/transfer-from-reservation.dto';
import { ReceiveTransferDto } from './dto/receive-transfer.dto';
import { ReceiveTransferStrategy } from '../strategies/receive-transfer.strategy';
import { FindMovementsQueryDto } from './dto/find-movements.dto';
import { IssueFromReservationDto } from './dto/issue-from-reservation.dto';

@Injectable()
export class MovementsService {
  constructor(
    private readonly strategyFactory: MovementStrategyFactory,
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
    private receiveTransferStrategy: ReceiveTransferStrategy,
  ) {}

  createEntry(dto: CreateEntryDto) {
    return this.strategyFactory.make(MovementType.ENTRANCE).execute(dto);
  }

  createIssue(dto: CreateIssueDto) {
    return this.strategyFactory.make(MovementType.ISSUE).execute(dto);
  }

  createIssueFromTransfer(dto: IssueFromReservationDto) {
    return this.strategyFactory.make(MovementType.ISSUE_FROM_RESERVATION).execute(dto);
  }


  createTransfer(dto: TransferMovementDto) {
    return this.strategyFactory.make(MovementType.TRANSFER).execute(dto);
  }

  createTransferFromReservation(dto: TransferFromReservationDto) {
    return this.strategyFactory
      .make(MovementType.TRANSFER_FROM_RESERVATION)
      .execute(dto);
  }

  receiveTransfer(dto: ReceiveTransferDto) {
    return this.receiveTransferStrategy.execute(dto); // inyectada directo, fuera del factory
  }

  async findOne(id: number) {
    const movement = await this.movementRepository.findOne({
      where: { id },
      relations: { sourceStock: true },
    });
    if (!movement)
      throw new NotFoundException(`Movement with ID ${id} was not found`);
    return movement;
  }

  // movements.service.ts — método findAll
  async findAll(query?: FindMovementsQueryDto): Promise<Movement[]> {
    const qb = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.sourceStock', 'sourceStock')
      .leftJoinAndSelect('sourceStock.warehouse', 'sourceWarehouse')
      .leftJoinAndSelect('sourceStock.sku', 'sourceSku')
      .leftJoinAndSelect('sourceSku.productVariant', 'sourceProductVariant')
      .leftJoinAndSelect('movement.destinationStock', 'destinationStock')
      .leftJoinAndSelect('destinationStock.warehouse', 'destinationWarehouse')
      .leftJoinAndSelect('destinationStock.sku', 'destinationSku')
      .leftJoinAndSelect(
        'destinationSku.productVariant',
        'destinationProductVariant',
      )
      .leftJoinAndSelect('movement.reservation', 'reservation')
      .orderBy('movement.date', 'DESC');

    if (query?.type) {
      qb.andWhere('movement.type = :type', { type: query.type });
    }

    if (query?.status) {
      qb.andWhere('movement.status = :status', { status: query.status });
    }

    if (query?.transferGroupId) {
      qb.andWhere('movement.transferGroupId = :transferGroupId', {
        transferGroupId: query.transferGroupId,
      });
    }

    if (query?.warehouseId !== undefined) {
      qb.andWhere(
        '(sourceWarehouse.id = :warehouseId OR destinationWarehouse.id = :warehouseId)',
        { warehouseId: query.warehouseId },
      );
    }

    if (query?.productVariantId) {
      qb.andWhere(
        '(sourceProductVariant.id = :productVariantId OR destinationProductVariant.id = :productVariantId)',
        { productVariantId: query.productVariantId },
      );
    }

    if (query?.dateFrom) {
      qb.andWhere('movement.date >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query?.dateTo) {
      qb.andWhere('movement.date <= :dateTo', { dateTo: query.dateTo });
    }

    return qb.getMany();
  }
}
