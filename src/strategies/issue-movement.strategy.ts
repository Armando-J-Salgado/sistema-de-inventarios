import { CreateIssueDto } from 'src/movements/dto/create-issue.dto';
import { MovementStrategy } from './movement-strategy.interface';
import { BadRequestException, Injectable } from '@nestjs/common';
import { MovementEntityResolverService } from 'src/movements/support/movement-entity-resolver.service';
import { Sku } from 'src/skus/entities/skus.entity';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { DataSource, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MovementType } from 'src/enums/movement-type.enum';
import { ValidationFactory } from 'src/factories/validation.factory';
import { ValidationHandler } from 'src/validations/validation.handler';
import { MovementValidationContext } from 'src/validations/movement-validation-context.interface';
import { StockAllocationService } from 'src/movements/support/stock-allocation.service';

@Injectable()
export class IssueMovementStrategy implements MovementStrategy<CreateIssueDto> {
  private readonly rules = ['product-variant-existence', 'warehouse-manager-permission'];

  constructor(
    private readonly resolver: MovementEntityResolverService,
    @InjectRepository(Sku) private readonly skuRepository: Repository<Sku>,
    private readonly dataSource: DataSource,
    private readonly stockAllocation: StockAllocationService,
  ) {}

  async execute(dto: CreateIssueDto): Promise<Movement[]> {
    const { warehouse, employee } = await this.resolver.resolveWarehouseAndEmployee(
      dto.warehouseId,
      dto.employeeId,
    );

    // PASO 2: SKUs for the variant, oldest first (FEFO)
    const skus = await this.skuRepository.find({
      where: { productVariant: { id: dto.productVariantId } },
      order: { bestBeforeDate: 'ASC' },
    });

    await this.validate(this.rules, {
      warehouse,
      employee,
      quantity: dto.quantity,
      skus,
      productVariantId: dto.productVariantId,
    });

    // PASO 3+4: stocks for those SKUs in this warehouse, same age order, minus active reservations
    const allocationPlan = await this.stockAllocation.buildAllocationPlan(skus, warehouse, dto.quantity);

    // PASO 6 (insufficient branch): nothing written yet, safe to throw
    if (allocationPlan.remaining > 0) {
      throw new BadRequestException(
        `Insufficient stock for product variant ${dto.productVariantId}: missing ${allocationPlan.remaining} units`,
      );
    }

    // PASO 6 (covered branch): apply everything atomically
    return this.dataSource.transaction(async (manager) => {
      const movements: Movement[] = [];

      for (const { stock, quantity } of allocationPlan.allocations) {
        stock.quantity -= quantity;
        await manager.save(Stock, stock);

        const movement = manager.create(Movement, {
          sourceStock: stock,
          quantity,
          type: MovementType.ISSUE,
          status: 'COMPLETED',
          date: new Date(),
          totalCost: stock.sku.unitCost * quantity,
        });
        movements.push(await manager.save(Movement, movement));
      }

      warehouse.availableCapacity += dto.quantity;
      await manager.save(Warehouse, warehouse);

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