import { Injectable, NotFoundException } from "@nestjs/common";
import { MovementStrategy } from "./movement-strategy.interface";
import { TransferFromReservationDto } from "src/movements/dto/transfer-from-reservation.dto";
import { MovementEntityResolverService } from "src/movements/support/movement-entity-resolver.service";
import { StockAllocationService } from "src/movements/support/stock-allocation.service";
import { Employee } from "src/employees/entities/employee.entity";
import { Warehouse } from "src/warehouses/entities/warehouse.entity";
import { Movement } from "src/movements/entities/movement.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { randomUUID } from "crypto";
import { Stock } from "src/stocks/entities/stock.entity";
import { Reservation } from "src/reservations/entities/reservation.entity";
import { MovementStatus, MovementType } from "src/enums/movement-type.enum";
import { MovementValidationContext } from "src/validations/movement-validation-context.interface";
import { ValidationHandler } from "src/validations/validation.handler";
import { ValidationFactory } from "src/factories/validation.factory";

@Injectable()
export class TransferFromReservationStrategy implements MovementStrategy<TransferFromReservationDto> {
  private readonly rules = [
    'reservation-existence',
    'reservation-active-status',
    'warehouse-manager-permission',
    'stock-availability',
    'destination-warehouse-capacity',
  ];

  constructor(
    private readonly resolver: MovementEntityResolverService,
    private readonly stockAllocation: StockAllocationService,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Movement) private readonly movementRepository: Repository<Movement>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(dto: TransferFromReservationDto): Promise<Movement> {
    const employee = await this.employeeRepository.findOne({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException(`The employee with ID ${dto.employeeId} is not found`);

    const { reservation, warehouse: originWarehouse, stock: originStock } =
      await this.resolver.resolveWarehouseFromReservation(dto.reservationId);

    const destinationWarehouse = await this.warehouseRepository.findOne({ where: { id: dto.destinationWarehouseId } });
    if (!destinationWarehouse) {
      throw new NotFoundException(`The warehouse with ID ${dto.destinationWarehouseId} was not found`);
    }

    const quantity = reservation.quantity;

    await this.validate(this.rules, {
      warehouse: originWarehouse,
      employee,
      quantity,
      reservation,
      stock: originStock,
      destinationWarehouse,
    });

    const transferGroupId = randomUUID(); // grupo de un solo movimiento, pero se mantiene por consistencia con el flujo de recepción

    return this.dataSource.transaction(async (manager) => {
      originStock.quantity -= quantity;
      await manager.save(Stock, originStock);

      const destinationStock = await this.stockAllocation.findOrCreateStock(originStock.sku, destinationWarehouse, manager);

      reservation.status = 'COMPLETED';
      await manager.save(Reservation, reservation);

      destinationWarehouse.availableCapacity -= quantity;
      await manager.save(Warehouse, destinationWarehouse);

      const movement = manager.create(Movement, {
        sourceStock: originStock,
        destinationStock,
        quantity,
        type: MovementType.TRANSFER,
        status: MovementStatus.IN_TRANSIT,
        date: new Date(),
        totalCost: originStock.sku.unitCost * quantity,
        reservation,
        transferGroupId,
      });
      return manager.save(Movement, movement);
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