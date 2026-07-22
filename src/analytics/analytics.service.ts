import { Injectable } from '@nestjs/common';
import { Product } from 'src/products/entities/product.entity';

@Injectable()
export class AnalyticsService {
  calculateRotation(productId: number): number {
    return 0;
  }

  topMovingProducts(): Product[] {
    return [];
  }

  coverageDays(skuId: string): number {
    return 0;
  }
}
