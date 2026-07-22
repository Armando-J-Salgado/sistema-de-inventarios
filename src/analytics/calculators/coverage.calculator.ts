import { Injectable } from '@nestjs/common';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

@Injectable()
export class CoverageCalculator {
  async calculate(skuId: string, repository: IAnalyticsRepository): Promise<any> {
    const data = await repository.getCoverageData(skuId);
    
    let coverageDays = 0;
    if (data.avgDailyConsumption > 0) {
      coverageDays = Math.floor(data.stockQuantity / data.avgDailyConsumption);
    }

    return {
      skuId,
      coverageDays,
      dataSource: data.type,
      ...data
    };
  }
}
