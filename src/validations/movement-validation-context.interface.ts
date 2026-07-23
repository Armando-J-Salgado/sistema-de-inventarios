// validations/movement-validation-context.interface.ts
import { Sku } from '../skus/entities/skus.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { Stock } from '../stocks/entities/stock.entity';

export interface MovementValidationContext {
  warehouse: Warehouse;
  employee: Employee;
  quantity: number;
  sku?: Sku;              // Entrance: single sku
  skus?: Sku[];            // Issue: candidate lots for the product variant
  productVariantId?: number; // Issue only
  destinationWarehouse?: Warehouse;
  reservation?: Reservation;
  stock?: Stock
}