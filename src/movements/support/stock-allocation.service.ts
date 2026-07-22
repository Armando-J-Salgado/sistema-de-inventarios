// movements/support/stock-allocation.service.ts
import { Injectable } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Sku } from 'src/skus/entities/skus.entity';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';

@Injectable()
export class StockAllocationService {
  constructor(
    @InjectRepository(Stock) private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Reservation) private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async buildAllocationPlan(skus: Sku[], warehouse: Warehouse, quantityNeeded: number) {
    if (!skus.length) {
      return { allocations: [], remaining: quantityNeeded };
    }

    const stocks = await this.stockRepository.find({
      where: { sku: { id: In(skus.map((s) => s.id)) }, warehouse: { id: warehouse.id }, active: true },
      relations: { sku: true, warehouse: true },
    });

    const orderedStocks = skus
      .map((sku) => stocks.find((s) => s.sku.id === sku.id))
      .filter((s): s is Stock => !!s);

    let remaining = quantityNeeded;
    const allocations: { stock: Stock; quantity: number }[] = [];

    for (const stock of orderedStocks) {
      if (remaining <= 0) break;
      const reserved = await this.getActiveReservedQuantity(stock.id);
      const available = stock.quantity - reserved;
      if (available <= 0) continue;

      const take = Math.min(available, remaining);
      allocations.push({ stock, quantity: take });
      remaining -= take;
    }

    return { allocations, remaining };
  }

  async findOrCreateStock(sku: Sku, warehouse: Warehouse, manager: EntityManager): Promise<Stock> {
    let stock = await manager.findOne(Stock, {
      where: { sku: { id: sku.id }, warehouse: { id: warehouse.id } },
      relations: { sku: true, warehouse: true },
    });
    if (!stock) {
      stock = manager.create(Stock, { sku, warehouse, quantity: 0, active: true });
      stock = await manager.save(Stock, stock);
    }
    return stock;
  }

  private async getActiveReservedQuantity(stockId: number): Promise<number> {
    const reservations = await this.reservationRepository.find({
      where: { stock: { id: stockId }, status: 'ACTIVE' },
    });
    return reservations.reduce((sum, r) => sum + r.quantity, 0);
  }
}