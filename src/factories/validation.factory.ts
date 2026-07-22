// factories/validation.factory.ts
import { BadRequestException } from "@nestjs/common";
import { IsWarehouseManagerValidator } from "src/validations/is-warehouse-manager.validator";
import { LotAvailableValidator } from "src/validations/lot-available.validator";
import { ProductVariantExistenceValidator } from "src/validations/product-variant-existence.validator";
import { SkuExistenceValidator } from "src/validations/sku-existence.validator";
import { ValidationHandler } from "src/validations/validation.handler";
import { WarehouseCapacityValidator } from "src/validations/warehouse-capacity.validator";
import { ReservationExistenceValidator } from "src/validations/reservation-existence.validator";
import { ReservationActiveStatusValidator } from "src/validations/reservation-status.validator";
import { StockAvailabilityValidator } from "src/validations/stock-availability.validator";
import { DestinationWarehouseCapacityValidator } from "src/validations/destination-warehouse-capacity.validator";

export class ValidationFactory {
    public static make(type: string): ValidationHandler {
        switch (type) {
            case 'lot-availability':
                return new LotAvailableValidator();
            case 'sku-existence':
                return new SkuExistenceValidator();
            case 'warehouse-manager-permission':
                return new IsWarehouseManagerValidator();
            case 'warehouse-capacity':
                return new WarehouseCapacityValidator();
            case 'product-variant-existence':
                return new ProductVariantExistenceValidator();
            case 'reservation-existence':
                return new ReservationExistenceValidator();
            case 'reservation-active-status':
                return new ReservationActiveStatusValidator();
            case 'stock-availability':
                return new StockAvailabilityValidator();
            case 'destination-warehouse-capacity':
                return new DestinationWarehouseCapacityValidator();
            default:
                throw new BadRequestException('An invalid rule was applied to this movement');
        }
    }
}