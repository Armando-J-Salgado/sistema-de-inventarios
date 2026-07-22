import { Injectable, NotFoundException } from '@nestjs/common';
import { IAnalyticsRepository } from './analytics-repository.interface';

@Injectable()
export class GlobalAnalyticsRepository implements IAnalyticsRepository {
  private mockProducts = [1, 2, 3, 4, 5, 10];
  private mockSkus = ['SKU-1', 'SKU-2', 'SKU-123'];

  async getRotationData(productId: number): Promise<any> {
    if (!this.mockProducts.includes(productId)) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    // Mock global database query
    return { productId, rotationRate: 5.5, movements: 120, type: 'global' };
  }

  async getTopMovingData(limit: number): Promise<any[]> {
    // Mock global top moving query
    const allProducts = [
      { productId: 1, name: 'Product A', movementCount: 500, type: 'global' },
      { productId: 2, name: 'Product B', movementCount: 450, type: 'global' },
      { productId: 3, name: 'Product C', movementCount: 400, type: 'global' },
      { productId: 4, name: 'Product D', movementCount: 350, type: 'global' },
      { productId: 5, name: 'Product E', movementCount: 300, type: 'global' },
      { productId: 10, name: 'Product X', movementCount: 200, type: 'global' },
    ];
    return allProducts.slice(0, limit);
  }

  async getCoverageData(skuId: string): Promise<any> {
    if (!this.mockSkus.includes(skuId)) {
      throw new NotFoundException(`SKU with ID ${skuId} not found`);
    }
    // Mock global coverage query
    return { skuId, stockQuantity: 1000, avgDailyConsumption: 50, type: 'global' };
  }

  async getNeedReorderData(): Promise<any[]> {
    // Mock product variants that are below reorder point
    return [
      { productVariantId: 1, name: 'Variant A', currentStock: 5, reorderPoint: 10, type: 'global' },
      { productVariantId: 4, name: 'Variant D', currentStock: 0, reorderPoint: 5, type: 'global' },
    ];
  }
}
