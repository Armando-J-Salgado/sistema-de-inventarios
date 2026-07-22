// strategies/issue-from-reservation.strategy.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { MovementStrategy } from "./movement-strategy.interface";
import { IssueFromReservationDto } from "src/movements/dto/issue-from-reservation.dto";
import { MovementEntityResolverService } from "src/movements/support/movement-entity-resolver.service";
import { Employee } from "src/employees/entities/employee.entity";
import { Warehouse } from "src/warehouses/entities/warehouse.entity";
import { Movement } from "src/movements/entities/movement.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Stock } from "src/stocks/entities/stock.entity";
import { Reservation } from "src/reservations/entities/reservation.entity";
import { MovementStatus, MovementType } from "src/enums/movement-type.enum";
import { MovementValidationContext } from "src/validations/movement-validation-context.interface";
import { ValidationHandler } from "src/validations/validation.handler";
import { ValidationFactory } from "src/factories/validation.factory";

@Injectable()
export class IssueFromReservationStrategy implements MovementStrategy<IssueFromReservationDto> {
  private readonly rules = [
    'reservation-existence',
    'reservation-active-status',
    'warehouse-manager-permission',
    'stock-availability',
  ];

  constructor(
    private readonly resolver: MovementEntityResolverService,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Movement) private readonly movementRepository: Repository<Movement>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(dto: IssueFromReservationDto): Promise<Movement> {
    // STEP 1: resolve entities
    const employee = await this.employeeRepository.findOne({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException(`The employee with ID ${dto.employeeId} is not found`);

    const { reservation, warehouse, stock } =
      await this.resolver.resolveWarehouseFromReservation(dto.reservationId);

    const quantity = reservation.quantity;

    // STEP 2: validate
    await this.validate(this.rules, {
      warehouse,
      employee,
      quantity,
      reservation,
      stock,
    });

    // STEP 3 + 4: apply updates and create the movement atomically
    return this.dataSource.transaction(async (manager) => {
      stock.quantity -= quantity;
      await manager.save(Stock, stock);

      reservation.status = 'COMPLETED';
      await manager.save(Reservation, reservation);

      warehouse.availableCapacity += quantity;
      await manager.save(Warehouse, warehouse);

      const movement = manager.create(Movement, {
        sourceStock: stock,
        quantity,
        type: MovementType.ISSUE,
        status: MovementStatus.COMPLETED,
        date: new Date(),
        totalCost: stock.sku.unitCost * quantity,
        reservation,
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