import { Injectable, NotFoundException } from '@nestjs/common';
import { MovementStrategy } from './movement-strategy.interface';
import { CreateEntryDto } from 'src/movements/dto/create-entry.dto';
import { MovementEntityResolverService } from 'src/movements/support/movement-entity-resolver.service';
import { Sku } from 'src/skus/entities/skus.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Repository } from 'typeorm';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MovementType } from 'src/enums/movement-type.enum';
import { Employee } from 'src/employees/entities/employee.entity';
import { ValidationHandler } from 'src/validations/validation.handler';
import { ValidationFactory } from 'src/factories/validation.factory';

@Injectable()
export class EntranceMovementStrategy implements MovementStrategy<CreateEntryDto> {
  private readonly rules = [
    'lot-availability',
    'sku-existence',
    'warehouse-manager-permission',
    'warehouse-capacity',
  ];

  constructor(
    private readonly resolver: MovementEntityResolverService,
    @InjectRepository(Sku) private readonly skuRepository: Repository<Sku>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Movement)
    private readonly movementRepository: Repository<Movement>,
  ) {}

  async execute(dto: CreateEntryDto): Promise<Movement> {
    const sku = await this.skuRepository.findOne({ where: { id: dto.skuId }, relations: { lot: true } });
    if (!sku)
      throw new NotFoundException(
        `Products with SKU ${dto.skuId} could not be found`,
      );

    const { warehouse, employee } =
      await this.resolver.resolveWarehouseAndEmployee(
        dto.warehouseId,
        dto.employeeId,
      );

    await this.validate(this.rules, sku, warehouse, employee, dto.quantity); // <- now awaited

    const stock = await this.transferToStock(sku, warehouse, dto.quantity);

    Object.assign(sku, { quantity: sku.quantity - dto.quantity }); // note: was `-` in your code, see flag below
    await this.skuRepository.save(sku);

    Object.assign(warehouse, {
      availableCapacity: warehouse.availableCapacity - dto.quantity,
    });
    await this.warehouseRepository.save(warehouse);

    const movement = this.movementRepository.create({
      sourceStock: stock,
      quantity: dto.quantity,
      type: MovementType.ENTRANCE,
      status: 'COMPLETED',
      date: new Date(),
      totalCost: sku.unitCost * dto.quantity,
    });

    return this.movementRepository.save(movement);
  }

  /**
   * Creates or updates a stock
   * @param sku
   * @param warehouse
   * @param quantity
   * @returns
   */
  private async transferToStock(
    sku: Sku,
    warehouse: Warehouse,
    quantity: number,
  ): Promise<Stock> {
    let stock = await this.stockRepository.findOne({
      where: { sku: { id: sku.id }, warehouse: { id: warehouse.id } },
      relations: { sku: true, warehouse: true },
    });

    if (!stock) {
      stock = this.stockRepository.create({
        sku,
        warehouse,
        quantity,
        active: true,
      });
      return await this.stockRepository.save(stock);
    }

    Object.assign(stock, { quantity: stock.quantity + quantity });
    return await this.stockRepository.save(stock);
  }

  private async validate(
    rules: Array<string>,
    sku: Sku,
    warehouse: Warehouse,
    employee: Employee,
    quantity: number,
  ) {
    let validator: ValidationHandler | undefined;

    rules.forEach((element) => {
      const newValidator = ValidationFactory.make(element);
      if (validator !== undefined) {
        validator = validator.setNext(newValidator);
      } else {
        validator = newValidator;
      }
    });

    await validator?.handle({
      warehouse,
      employee,
      quantity,
      sku,
    });
  }
}
