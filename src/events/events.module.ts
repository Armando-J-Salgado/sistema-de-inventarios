import { Module } from '@nestjs/common';
import { MovementListener } from './movement.listener';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AnalyticsModule, AlertsModule],
  providers: [MovementListener],
})
export class EventsModule {}
