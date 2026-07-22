import { Injectable } from '@nestjs/common';
import { IAnalyticsRepository } from '../repositories/analytics-repository.interface';

@Injectable()
export class RotationCalculator {
  async calculate(productId: number, repository: IAnalyticsRepository): Promise<any> {
    const data = await repository.getRotationData(productId);
    
    const rotationValue = data.movements > 0 ? data.rotationRate * 1.5 : 0;

    return {
      productId,
      rotation: rotationValue,
      dataSource: data.type,
      ...data
    };
  }
}
