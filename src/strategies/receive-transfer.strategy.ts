import { Injectable, NotFoundException } from "@nestjs/common";
import { MovementStrategy } from "./movement-strategy.interface";
import { ReceiveTransferDto } from "src/movements/dto/receive-transfer.dto";
import { Employee } from "src/employees/entities/employee.entity";
import { Movement } from "src/movements/entities/movement.entity";
import { Warehouse } from "src/warehouses/entities/warehouse.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { MovementStatus } from "src/enums/movement-type.enum";
import { Stock } from "src/stocks/entities/stock.entity";
import { MovementValidationContext } from "src/validations/movement-validation-context.interface";
import { ValidationHandler } from "src/validations/validation.handler";
import { ValidationFactory } from "src/factories/validation.factory";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class ReceiveTransferStrategy implements MovementStrategy<ReceiveTransferDto> {
  private readonly rules = ['warehouse-manager-permission']; // validado contra la bodega destino

  constructor(
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Movement) private readonly movementRepository: Repository<Movement>,
    @InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ReceiveTransferDto): Promise<Movement[]> {
    const employee = await this.employeeRepository.findOne({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException(`The employee with ID ${dto.employeeId} is not found`);

    const movements = await this.movementRepository.find({
      where: { transferGroupId: dto.transferGroupId, status: MovementStatus.IN_TRANSIT },
      relations: {
        sourceStock: { warehouse: true, sku: true },
        destinationStock: { warehouse: true, sku: true },
      },
    });
    if (!movements.length) {
      throw new NotFoundException(`No pending transfer found for group ${dto.transferGroupId}`);
    }

    const destinationWarehouse = movements[0].destinationStock.warehouse;
    const originWarehouse = movements[0].sourceStock.warehouse;

    await this.validate(this.rules, { warehouse: destinationWarehouse, employee, quantity: 0 });

    const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);

    return this.dataSource.transaction(async (manager) => {
      const updated: Movement[] = [];

      for (const movement of movements) {
        if (dto.decision === 'ACCEPT') {
          movement.destinationStock.quantity += movement.quantity;
          await manager.save(Stock, movement.destinationStock);
          movement.status = MovementStatus.COMPLETED;
        } else {
          movement.sourceStock.quantity += movement.quantity;
          await manager.save(Stock, movement.sourceStock);
          movement.status = MovementStatus.REJECTED;
        }
        updated.push(await manager.save(Movement, movement));
        this.eventEmitter.emitAsync('movement.created', movement);
      }

      if (dto.decision === 'ACCEPT') {
        originWarehouse.availableCapacity += totalQuantity;
        await manager.save(Warehouse, originWarehouse);
      } else {
        destinationWarehouse.availableCapacity += totalQuantity;
        await manager.save(Warehouse, destinationWarehouse);
      }

      return updated;
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