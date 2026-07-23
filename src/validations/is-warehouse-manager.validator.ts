import { ValidationHandler } from "./validation.handler";
import { ForbiddenException } from "@nestjs/common";
import { MovementValidationContext } from "./movement-validation-context.interface";

export class IsWarehouseManagerValidator extends ValidationHandler {
    public handle(context: MovementValidationContext): boolean {
        const { employee, warehouse } = context;
        if(employee.role !== 'ADMINISTRATOR' && employee.id !== warehouse.administrator?.id) {
            throw new ForbiddenException(`The employee is not allowed to manage warehouse #${warehouse.id}`);
        }

        return super.handle(context);
    }
}