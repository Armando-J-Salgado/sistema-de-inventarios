import { BadRequestException } from '@nestjs/common';
import { ValidationHandler } from './validation.handler';
import { MovementValidationContext } from './movement-validation-context.interface';

export class SkuExistenceValidator extends ValidationHandler {
  public handle(context: MovementValidationContext): boolean {
    const { sku, quantity } = context;
    if (!sku || sku.quantity < quantity) {
      throw new BadRequestException(
        `Not enough items available. ${quantity} were requested, only ${sku?.quantity ?? 0} available`,
      );
    }
    return super.handle(context);
  }
}