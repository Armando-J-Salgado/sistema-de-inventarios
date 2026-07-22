import { Injectable, Scope, NotFoundException, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAnalyticsRepository } from './analytics-repository.interface';
import { Product } from '../../products/entities/product.entity';
import { Sku } from '../../skus/entities/skus.entity';
import { Stock } from '../../stocks/entities/stock.entity';
import { Movement } from '../../movements/entities/movement.entity';

@Injectable({ scope: Scope.REQUEST })
export class WarehouseAnalyticsRepository implements IAnalyticsRepository {
  private warehouseId: number;

  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Sku) private readonly skuRepo: Repository<Sku>,
    @InjectRepository(Stock) private readonly stockRepo: Repository<Stock>,
    @InjectRepository(Movement) private readonly movementRepo: Repository<Movement>,
  ) {}

  setWarehouseId(id: number) {
    this.warehouseId = id;
  }

  getWarehouseId(): number {
    return this.warehouseId;
  }

  async getRotationData(productId: number): Promise<any> {
    if (!this.warehouseId) throw new Error('Warehouse ID is not set');
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const movements = await this.movementRepo.createQueryBuilder('movement')
      .leftJoin('movement.sourceStock', 'stock')
      .leftJoin('stock.warehouse', 'warehouse')
      .leftJoin('stock.sku', 'sku')
      .leftJoin('sku.productVariant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('product.id = :productId', { productId })
      .andWhere('warehouse.id = :warehouseId', { warehouseId: this.warehouseId })
      .getCount();

    const exitSumQuery = await this.movementRepo.createQueryBuilder('movement')
      .select('SUM(movement.quantity)', 'sum')
      .leftJoin('movement.sourceStock', 'stock')
      .leftJoin('stock.warehouse', 'warehouse')
      .leftJoin('stock.sku', 'sku')
      .leftJoin('sku.productVariant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('product.id = :productId', { productId })
      .andWhere('warehouse.id = :warehouseId', { warehouseId: this.warehouseId })
      .andWhere("movement.type = 'EXIT'")
      .getRawOne();
    
    const exitSum = parseFloat(exitSumQuery?.sum || '0');

    const stockSumQuery = await this.stockRepo.createQueryBuilder('stock')
      .select('SUM(stock.quantity)', 'sum')
      .leftJoin('stock.warehouse', 'warehouse')
      .leftJoin('stock.sku', 'sku')
      .leftJoin('sku.productVariant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('product.id = :productId', { productId })
      .andWhere('warehouse.id = :warehouseId', { warehouseId: this.warehouseId })
      .getRawOne();
      
    const stockSum = parseFloat(stockSumQuery?.sum || '0');
    
    const rotationRate = stockSum > 0 ? exitSum / stockSum : 0;

    return { productId, rotationRate, movements, type: 'warehouse', warehouseId: this.warehouseId };
  }

  async getTopMovingData(limit: number): Promise<any[]> {
    if (!this.warehouseId) throw new Error('Warehouse ID is not set');
    const results = await this.movementRepo.createQueryBuilder('movement')
      .select('product.id', 'productId')
      .addSelect('product.name', 'name')
      .addSelect('SUM(movement.quantity)', 'movementCount')
      .leftJoin('movement.sourceStock', 'stock')
      .leftJoin('stock.warehouse', 'warehouse')
      .leftJoin('stock.sku', 'sku')
      .leftJoin('sku.productVariant', 'variant')
      .leftJoin('variant.product', 'product')
      .where("movement.type = 'EXIT'")
      .andWhere('warehouse.id = :warehouseId', { warehouseId: this.warehouseId })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('SUM(movement.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map(r => ({
      productId: r.productId,
      name: r.name,
      movementCount: parseFloat(r.movementCount || '0'),
      type: 'warehouse',
      warehouseId: this.warehouseId
    }));
  }

  async getCoverageData(skuId: string): Promise<any> {
    if (!this.warehouseId) throw new Error('Warehouse ID is not set');
    const sku = await this.skuRepo.findOne({ where: { id: skuId } });
    if (!sku) {
      throw new NotFoundException(`SKU with ID ${skuId} not found`);
    }

    const stockSumQuery = await this.stockRepo.createQueryBuilder('stock')
      .select('SUM(stock.quantity)', 'sum')
      .leftJoin('stock.warehouse', 'warehouse')
      .where('stock.skuId = :skuId', { skuId })
      .andWhere('warehouse.id = :warehouseId', { warehouseId: this.warehouseId })
      .getRawOne();
    const stockQuantity = parseFloat(stockSumQuery?.sum || '0');

    // 30 days ago calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const exitSumQuery = await this.movementRepo.createQueryBuilder('movement')
      .select('SUM(movement.quantity)', 'sum')
      .leftJoin('movement.sourceStock', 'stock')
      .leftJoin('stock.warehouse', 'warehouse')
      .where('stock.skuId = :skuId', { skuId })
      .andWhere('warehouse.id = :warehouseId', { warehouseId: this.warehouseId })
      .andWhere("movement.type = 'EXIT'")
      .andWhere('movement.date >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getRawOne();
      
    const totalConsumption30Days = parseFloat(exitSumQuery?.sum || '0');
    const avgDailyConsumption = totalConsumption30Days / 30;

    return { skuId, stockQuantity, avgDailyConsumption, type: 'warehouse', warehouseId: this.warehouseId };
  }

  async getNeedReorderData(): Promise<any[]> {
    throw new NotImplementedException('This metric is globally exclusive');
  }
}
