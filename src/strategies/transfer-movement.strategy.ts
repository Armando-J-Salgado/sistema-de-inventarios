import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MovementStrategy } from './movement-strategy.interface';
import { TransferMovementDto } from 'src/movements/dto/transfer-movement.dto';
import { MovementEntityResolverService } from 'src/movements/support/movement-entity-resolver.service';
import { StockAllocationService } from 'src/movements/support/stock-allocation.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Sku } from 'src/skus/entities/skus.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { Stock } from 'src/stocks/entities/stock.entity';
import { MovementStatus, MovementType } from 'src/enums/movement-type.enum';
import { MovementValidationContext } from 'src/validations/movement-validation-context.interface';
import { ValidationHandler } from 'src/validations/validation.handler';
import { ValidationFactory } from 'src/factories/validation.factory';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TransferMovementStrategy implements MovementStrategy<TransferMovementDto> {
  private readonly rules = [
    'warehouse-manager-permission',
    'product-variant-existence',
    'destination-warehouse-capacity',
  ];

  constructor(
    private readonly resolver: MovementEntityResolverService,
    private readonly stockAllocation: StockAllocationService,
    @InjectRepository(Sku) private readonly skuRepository: Repository<Sku>,
    @InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Movement) private readonly movementRepository: Repository<Movement>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: TransferMovementDto): Promise<Movement[]> {
    const { warehouse: originWarehouse, employee } = await this.resolver.resolveWarehouseAndEmployee(
      dto.originWarehouseId,
      dto.employeeId,
    );

    const destinationWarehouse = await this.warehouseRepository.findOne({ where: { id: dto.destinationWarehouseId } });
    if (!destinationWarehouse) {
      throw new NotFoundException(`The warehouse with ID ${dto.destinationWarehouseId} was not found`);
    }

    const skus = await this.skuRepository.find({
      where: { productVariant: { id: dto.productVariantId } },
      order: { bestBeforeDate: 'ASC' },
    });

    await this.validate(this.rules, {
      warehouse: originWarehouse,
      employee,
      quantity: dto.quantity,
      skus,
      productVariantId: dto.productVariantId,
      destinationWarehouse,
    });

    const allocationPlan = await this.stockAllocation.buildAllocationPlan(skus, originWarehouse, dto.quantity);
    if (allocationPlan.remaining > 0) {
      throw new BadRequestException(
        `Insufficient stock for product variant ${dto.productVariantId}: missing ${allocationPlan.remaining} units`,
      );
    }

    const transferGroupId = randomUUID();

    return this.dataSource.transaction(async (manager) => {
      const movements: Movement[] = [];

      for (const { stock: originStock, quantity } of allocationPlan.allocations) {
        originStock.quantity -= quantity;
        await manager.save(Stock, originStock);

        const destinationStock = await this.stockAllocation.findOrCreateStock(originStock.sku, destinationWarehouse, manager);

        const movement = manager.create(Movement, {
          sourceStock: originStock,
          destinationStock,
          quantity,
          type: MovementType.TRANSFER,
          status: MovementStatus.IN_TRANSIT,
          date: new Date(),
          totalCost: originStock.sku.unitCost * quantity,
          transferGroupId,
        });
        movements.push(await manager.save(Movement, movement));
        this.eventEmitter.emitAsync('movement.created', movement);
      }

      destinationWarehouse.availableCapacity -= dto.quantity;
      await manager.save(Warehouse, destinationWarehouse);

      return movements;
    });
  }

  private async validate(rules: string[], context: MovementValidationContext): Promise<void> {
    let validator: ValidationHandler | undefined;
    rules.forEach((rule) => {
      const next = ValidationFactory.make(rule);
      validator = validator ? validator.setNext(next) : next;
    });
    await validator?.handle(context);
  }
}