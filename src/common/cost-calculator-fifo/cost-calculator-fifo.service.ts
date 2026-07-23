import { Injectable } from '@nestjs/common';
import { Sku } from '../../skus/entities/skus.entity';

@Injectable()
export class CostCalculatorFifoService {
  calculateCost(sku: Sku, quantity: number): number {
    return 0;
  }
}
