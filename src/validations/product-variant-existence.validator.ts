import { NotFoundException } from '@nestjs/common';
import { ValidationHandler } from './validation.handler';
import { MovementValidationContext } from './movement-validation-context.interface';

export class ProductVariantExistenceValidator extends ValidationHandler {
  public handle(context: MovementValidationContext): boolean {
    if (!context.skus || context.skus.length === 0) {
      throw new NotFoundException(`Product variant ${context.productVariantId} has no available lots`);
    }
    return super.handle(context);
  }
}