import { Injectable } from '@nestjs/common';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

@Injectable()
export class NeedReorderCalculator {
  async calculate(repository: IAnalyticsRepository): Promise<any[]> {
    const data = await repository.getNeedReorderData();
    
    // The calculator simply returns the data, but it could filter or map it if needed.
    // In a real scenario, this is where we'd enforce any business rules regarding reordering.
    return data.map(item => ({
      ...item,
      needsReorder: true, // Explicitly mark
      dataSource: item.type,
    }));
  }
}
