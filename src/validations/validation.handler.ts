import { MovementValidationContext } from './movement-validation-context.interface';

export abstract class ValidationHandler {
  private next?: ValidationHandler;

  public handle(context: MovementValidationContext): boolean {
    if (this.next) {
      return this.next.handle(context);
    }
    return true;
  }

  public setNext(validator: ValidationHandler): ValidationHandler {
    this.next = validator;
    return validator;
  }
}