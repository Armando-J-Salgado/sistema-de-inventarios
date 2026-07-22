// validations/stock-availability.validator.ts
import { ValidationHandler } from "./validation.handler";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MovementValidationContext } from "./movement-validation-context.interface";

export class StockAvailabilityValidator extends ValidationHandler {
  public handle(context: MovementValidationContext): boolean {
    const { stock, quantity } = context;

    if (!stock) {
      throw new NotFoundException('Stock was not found');
    }

    if (!stock.active) {
      throw new BadRequestException(`The stock with id ${stock.id} is not active`);
    }

    if (stock.quantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock for stock id ${stock.id}: available ${stock.quantity}, needed ${quantity}`,
      );
    }

    return super.handle(context);
  }
}