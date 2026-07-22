// validations/movement-validation-context.interface.ts
import { Sku } from 'src/skus/entities/skus.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Stock } from 'src/stocks/entities/stock.entity';

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