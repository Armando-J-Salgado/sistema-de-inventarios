import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Employee } from "../../employees/entities/employee.entity";
import { ProductVariant } from "../../product-variants/entities/product-variant.entity";
import { Warehouse } from "../../warehouses/entities/warehouse.entity";
import { Reservation } from "../../reservations/entities/reservation.entity";
import { Stock } from "../../stocks/entities/stock.entity";
import { Repository } from "typeorm";

@Injectable()
export class MovementEntityResolverService {
  constructor(
    @InjectRepository(Warehouse) private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Employee) private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(ProductVariant) private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Reservation) private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async resolveWarehouseAndEmployee(warehouseId: number, employeeId: number) {
    const warehouse = await this.warehouseRepository.findOne({ where: { id: warehouseId }, relations: ['administrator'] });
    if (!warehouse) throw new NotFoundException(`The warehouse with ID ${warehouseId} was not found`);

    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException(`The employee with ID ${employeeId} is not found`);

    return { warehouse, employee };
  }

  async resolveProductVariant(productVariantId: number): Promise<ProductVariant> {
    const variant = await this.productVariantRepository.findOne({ where: { id: productVariantId } });
    if (!variant) throw new NotFoundException(`Product variant ${productVariantId} was not found`);
    return variant;
  }

  async resolveWarehouseFromReservation(reservationId: number): Promise<{
    reservation: Reservation;
    warehouse: Warehouse;
    stock: Stock;
  }> {
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: { stock: { warehouse: {administrator: true}, sku: true } },
    });
    if (!reservation) {
      throw new NotFoundException(`The reservation with ID ${reservationId} was not found`);
    }

    const stock = reservation.stock;
    if (!stock) {
      throw new NotFoundException(`The reservation with ID ${reservationId} has no associated stock`);
    }

    const warehouse = stock.warehouse;
    if (!warehouse) {
      throw new NotFoundException(`The stock associated with reservation ${reservationId} has no warehouse`);
    }

    return { reservation, warehouse, stock };
  }
}