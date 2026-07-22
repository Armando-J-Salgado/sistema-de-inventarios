// validations/reservation-existence.validator.ts
import { ValidationHandler } from "./validation.handler";
import { NotFoundException } from "@nestjs/common";
import { MovementValidationContext } from "./movement-validation-context.interface";

export class ReservationExistenceValidator extends ValidationHandler {
  public handle(context: MovementValidationContext): boolean {
    const { reservation } = context;

    if (!reservation) {
      throw new NotFoundException('Reservation was not found');
    }

    return super.handle(context);
  }
}