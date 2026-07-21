import { Injectable } from '@nestjs/common';
import { Sku } from 'src/skus/entities/skus.entity';

@Injectable()
export class CostCalculatorFifoService {
  calculateCost(sku: Sku, quantity: number): number {
    return 0;
  }
}
