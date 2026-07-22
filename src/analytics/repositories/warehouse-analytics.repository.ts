import { Injectable, Scope, NotFoundException } from '@nestjs/common';
import { IAnalyticsRepository } from './analytics-repository.interface';

@Injectable({ scope: Scope.REQUEST })
export class WarehouseAnalyticsRepository implements IAnalyticsRepository {
  private warehouseId: number;
  private mockProducts = [1, 2, 3, 4, 5, 10];
  private mockSkus = ['SKU-1', 'SKU-2', 'SKU-123'];

  setWarehouseId(id: number) {
    this.warehouseId = id;
  }

  getWarehouseId(): number {
    return this.warehouseId;
  }

  async getRotationData(productId: number): Promise<any> {
    if (!this.warehouseId) throw new Error('Warehouse ID is not set');
    if (!this.mockProducts.includes(productId)) {
      throw new NotFoundException(`Product with ID ${productId} not found in warehouse ${this.warehouseId}`);
    }
    // Mock database query filtered by warehouseId
    return { productId, rotationRate: 3.2, movements: 45, type: 'warehouse', warehouseId: this.warehouseId };
  }

  async getTopMovingData(limit: number): Promise<any[]> {
    if (!this.warehouseId) throw new Error('Warehouse ID is not set');
    // Mock top moving query filtered by warehouseId
    const allProducts = [
      { productId: 1, name: 'Product A', movementCount: 150, type: 'warehouse', warehouseId: this.warehouseId },
      { productId: 2, name: 'Product B', movementCount: 120, type: 'warehouse', warehouseId: this.warehouseId },
      { productId: 3, name: 'Product C', movementCount: 100, type: 'warehouse', warehouseId: this.warehouseId },
      { productId: 4, name: 'Product D', movementCount: 80, type: 'warehouse', warehouseId: this.warehouseId },
      { productId: 5, name: 'Product E', movementCount: 60, type: 'warehouse', warehouseId: this.warehouseId },
      { productId: 10, name: 'Product X', movementCount: 40, type: 'warehouse', warehouseId: this.warehouseId },
    ];
    return allProducts.slice(0, limit);
  }

  async getCoverageData(skuId: string): Promise<any> {
    if (!this.warehouseId) throw new Error('Warehouse ID is not set');
    if (!this.mockSkus.includes(skuId)) {
      throw new NotFoundException(`SKU with ID ${skuId} not found in warehouse ${this.warehouseId}`);
    }
    // Mock coverage query filtered by warehouseId
    return { skuId, stockQuantity: 200, avgDailyConsumption: 10, type: 'warehouse', warehouseId: this.warehouseId };
  }
}
