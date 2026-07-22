import { Injectable } from '@nestjs/common';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

@Injectable()
export class TopMovingCalculator {
  async calculate(repository: IAnalyticsRepository, limit: number = 5): Promise<any[]> {
    const data = await repository.getTopMovingData(limit);
    
    // Sort by movementCount descending
    const rankedData = data.sort((a, b) => b.movementCount - a.movementCount);

    return rankedData.map((item, index) => ({
      ...item,
      rank: index + 1,
      dataSource: item.type,
    }));
  }
}
