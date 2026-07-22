// validations/reservation-active-status.validator.ts
import { ValidationHandler } from "./validation.handler";
import { BadRequestException } from "@nestjs/common";
import { MovementValidationContext } from "./movement-validation-context.interface";

export class ReservationActiveStatusValidator extends ValidationHandler {
  public handle(context: MovementValidationContext): boolean {
    const { reservation } = context;

    if (!reservation) {
      throw new BadRequestException('Reservation was not found');
    }

    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException(
        `The reservation with id ${reservation.id} is not active (current status: ${reservation.status})`,
      );
    }

    return super.handle(context);
  }
}