import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Stock } from './entities/stock.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { Sku } from 'src/skus/entities/skus.entity';
import { ACTIVE_RESERVATION_STATUSES } from './constants';

@Injectable()
export class StocksService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
  ) {}

  async findAll(): Promise<Stock[]> {
    return await this.stockRepository.find();
  }

  async findOne(id: number): Promise<Stock> {
    const stock = await this.stockRepository.findOne({ where: { id } });
    if (!stock) {
      throw new NotFoundException(`The stock with id #${id} could not be found`);
    }
    return stock;
  }

  async update(id: number, updateStockDto: UpdateStockDto): Promise<Stock> {
    const stock = await this.findOne(id);
    const updatedStock = Object.assign(stock, updateStockDto);
    return await this.stockRepository.save(updatedStock);
  }

  async remove(id: number): Promise<Stock> {
    const stock = await this.findOne(id);
    stock.active = false;
    return await this.stockRepository.save(stock);
  }

  async getAvailable(stockId: number): Promise<number> {
    const stock = await this.findOne(stockId);
    const reservations = await this.reservationRepository.find({
      where: { stock: { id: stockId }, status: In(ACTIVE_RESERVATION_STATUSES) },
    });
    return this.computeAvailable(stock.quantity, reservations);
  }

  async getAvailableByVariantWarehouse(variantId: number, warehouseId?: number): Promise<number> {
    const skus = await this.skuRepository.find({ where: { productVariant: { id: variantId } } });
    if (skus.length === 0) {
      return 0;
    }

    const skuIds = skus.map((sku) => sku.id);
    const where: Record<string, unknown> = { sku: { id: In(skuIds) }, active: true };
    if (warehouseId !== undefined) {
      where.warehouse = { id: warehouseId };
    }
    const stocks = await this.stockRepository.find({ where });
    if (stocks.length === 0) {
      return 0;
    }

    let total = 0;
    for (const stock of stocks) {
      const reservations = await this.reservationRepository.find({
        where: { stock: { id: stock.id }, status: In(ACTIVE_RESERVATION_STATUSES) },
      });
      total += this.computeAvailable(stock.quantity, reservations);
    }
    return total;
  }

  private computeAvailable(quantity: number, reservations: Reservation[]): number {
    const now = new Date();
    const activeQuantity = reservations
      .filter((reservation) => reservation.toDate >= now)
      .reduce((sum, reservation) => sum + reservation.quantity, 0);
    return Math.max(0, quantity - activeQuantity);
  }
}
