export interface IAnalyticsRepository {
  getRotationData(productId: number): Promise<any>;
  getTopMovingData(limit: number): Promise<any[]>;
  getCoverageData(skuId: string): Promise<any>;
  getNeedReorderData(): Promise<any[]>;
}
