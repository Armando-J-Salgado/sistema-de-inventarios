import { ValidationHandler } from "./validation.handler";
import { BadRequestException } from "@nestjs/common";
import { MovementValidationContext } from "./movement-validation-context.interface";

export class LotAvailableValidator extends ValidationHandler {
    public handle(context: MovementValidationContext): boolean {
        const { sku } = context;
        if (!sku) {
            throw new BadRequestException('SKU was not found');
        }
        if(sku.lot.state !== 'RECEIVED') {
            throw new BadRequestException(`The sku belongs to lot with id ${sku.lot.id} which is not available at the moment`);
        }

        return super.handle(context);
    }
}