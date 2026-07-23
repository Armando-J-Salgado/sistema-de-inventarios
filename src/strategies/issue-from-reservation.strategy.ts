// strategies/issue-from-reservation.strategy.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { MovementStrategy } from "./movement-strategy.interface";
import { IssueFromReservationDto } from "../movements/dto/issue-from-reservation.dto";
import { MovementEntityResolverService } from "../movements/support/movement-entity-resolver.service";
import { Employee } from "../employees/entities/employee.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { Movement } from "../movements/entities/movement.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Stock } from "../stocks/entities/stock.entity";
import { Reservation } from "../reservations/entities/reservation.entity";
import { MovementStatus, MovementType } from "../enums/movement-type.enum";
import { MovementValidationContext } from "../validations/movement-validation-context.interface";
import { ValidationHandler } from "../validations/validation.handler";
import { ValidationFactory } from "../factories/validation.factory";
import { EventEmitter2 } from "@nestjs/event-emitter";

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
    private readonly eventEmitter: EventEmitter2,
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

      this.eventEmitter.emitAsync('movement.created', movement);
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