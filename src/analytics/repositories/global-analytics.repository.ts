import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAnalyticsRepository } from './analytics-repository.interface';
import { Product } from '../../products/entities/product.entity';
import { Sku } from '../../skus/entities/skus.entity';
import { ProductVariant } from '../../product-variants/entities/product-variant.entity';
import { Stock } from '../../stocks/entities/stock.entity';
import { Movement } from '../../movements/entities/movement.entity';

@Injectable()
export class GlobalAnalyticsRepository implements IAnalyticsRepository {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Sku) private readonly skuRepo: Repository<Sku>,
    @InjectRepository(ProductVariant) private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Stock) private readonly stockRepo: Repository<Stock>,
    @InjectRepository(Movement) private readonly movementRepo: Repository<Movement>,
  ) {}

  async getRotationData(productId: number): Promise<any> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const movements = await this.movementRepo.createQueryBuilder('movement')
      .leftJoin('movement.sourceStock', 'stock')
      .leftJoin('stock.sku', 'sku')
      .leftJoin('sku.productVariant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('product.id = :productId', { productId })
      .getCount();

    const exitSumQuery = await this.movementRepo.createQueryBuilder('movement')
      .select('SUM(movement.quantity)', 'sum')
      .leftJoin('movement.sourceStock', 'stock')
      .leftJoin('stock.sku', 'sku')
      .leftJoin('sku.productVariant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('product.id = :productId', { productId })
      .andWhere("movement.type = 'EXIT'")
      .getRawOne();
    
    const exitSum = parseFloat(exitSumQuery?.sum || '0');

    const stockSumQuery = await this.stockRepo.createQueryBuilder('stock')
      .select('SUM(stock.quantity)', 'sum')
      .leftJoin('stock.sku', 'sku')
      .leftJoin('sku.productVariant', 'variant')
      .leftJoin('variant.product', 'product')
      .where('product.id = :productId', { productId })
      .getRawOne();
      
    const stockSum = parseFloat(stockSumQuery?.sum || '0');
    
    const rotationRate = stockSum > 0 ? exitSum / stockSum : 0;

    return { productId, rotationRate, movements, type: 'global' };
  }

  async getTopMovingData(limit: number): Promise<any[]> {
    const results = await this.movementRepo.createQueryBuilder('movement')
      .select('product.id', 'productId')
      .addSelect('product.name', 'name')
      .addSelect('SUM(movement.quantity)', 'movementCount')
      .leftJoin('movement.sourceStock', 'stock')
      .leftJoin('stock.sku', 'sku')
      .leftJoin('sku.productVariant', 'variant')
      .leftJoin('variant.product', 'product')
      .where("movement.type = 'EXIT'")
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('SUM(movement.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    return results.map(r => ({
      productId: r.productId,
      name: r.name,
      movementCount: parseFloat(r.movementCount || '0'),
      type: 'global'
    }));
  }

  async getCoverageData(skuId: string): Promise<any> {
    const sku = await this.skuRepo.findOne({ where: { id: skuId } });
    if (!sku) {
      throw new NotFoundException(`SKU with ID ${skuId} not found`);
    }

    const stockSumQuery = await this.stockRepo.createQueryBuilder('stock')
      .select('SUM(stock.quantity)', 'sum')
      .where('stock.skuId = :skuId', { skuId })
      .getRawOne();
    const stockQuantity = parseFloat(stockSumQuery?.sum || '0');

    // 30 days ago calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const exitSumQuery = await this.movementRepo.createQueryBuilder('movement')
      .select('SUM(movement.quantity)', 'sum')
      .leftJoin('movement.sourceStock', 'stock')
      .where('stock.skuId = :skuId', { skuId })
      .andWhere("movement.type = 'EXIT'")
      .andWhere('movement.date >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getRawOne();
      
    const totalConsumption30Days = parseFloat(exitSumQuery?.sum || '0');
    const avgDailyConsumption = totalConsumption30Days / 30;

    return { skuId, stockQuantity, avgDailyConsumption, type: 'global' };
  }

  async getNeedReorderData(): Promise<any[]> {
    const variants = await this.variantRepo.createQueryBuilder('variant')
      .select('variant.id', 'productVariantId')
      .addSelect('variant.name', 'name')
      .addSelect('variant.reorder_point', 'reorderPoint')
      .addSelect('COALESCE(SUM(stock.quantity), 0)', 'currentStock')
      .leftJoin('variant.skus', 'sku')
      .leftJoin('sku.stocks', 'stock')
      .groupBy('variant.id')
      .addGroupBy('variant.name')
      .addGroupBy('variant.reorder_point')
      .having('COALESCE(SUM(stock.quantity), 0) < variant.reorder_point')
      .getRawMany();

    return variants.map(v => ({
      productVariantId: v.productVariantId,
      name: v.name,
      currentStock: parseFloat(v.currentStock || '0'),
      reorderPoint: v.reorderPoint,
      type: 'global'
    }));
  }
}
