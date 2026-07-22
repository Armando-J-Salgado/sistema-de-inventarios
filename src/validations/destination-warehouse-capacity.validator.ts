// validations/destination-warehouse-capacity.validator.ts
import { ValidationHandler } from "./validation.handler";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MovementValidationContext } from "./movement-validation-context.interface";

export class DestinationWarehouseCapacityValidator extends ValidationHandler {
  public handle(context: MovementValidationContext): boolean {
    const { destinationWarehouse, quantity } = context;

    if (!destinationWarehouse) {
      throw new NotFoundException('Destination warehouse was not found');
    }

    if (!destinationWarehouse.active) {
      throw new BadRequestException(`The destination warehouse with id ${destinationWarehouse.id} is not active`);
    }

    if (destinationWarehouse.availableCapacity < quantity) {
      throw new BadRequestException(
        `Insufficient capacity in destination warehouse ${destinationWarehouse.id}: available ${destinationWarehouse.availableCapacity}, needed ${quantity}`,
      );
    }

    return super.handle(context);
  }
}