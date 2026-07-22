import { Module } from '@nestjs/common';
import { CostCalculatorFifoService } from './cost-calculator-fifo/cost-calculator-fifo.service';

@Module({
  providers: [CostCalculatorFifoService],
  exports: [CostCalculatorFifoService],
})
export class CommonModule {}
