import { Employee } from "src/employees/entities/employee.entity";
import { Sku } from "src/skus/entities/skus.entity";
import { Warehouse } from "src/warehouses/entities/warehouse.entity";
import { ValidationHandler } from "./validation.handler";
import { BadRequestException } from "@nestjs/common";
import { MovementValidationContext } from "./movement-validation-context.interface";

export class WarehouseCapacityValidator extends ValidationHandler {
    public handle(context: MovementValidationContext): boolean {
        const {warehouse, quantity} = context;
        if(warehouse.availableCapacity < quantity) {
            throw new BadRequestException(`There is not enough capacity in the warehouse. Needs ${quantity} spaces, only ${warehouse.availableCapacity} spaces remaining`)
        }

        return super.handle(context);
    }
}