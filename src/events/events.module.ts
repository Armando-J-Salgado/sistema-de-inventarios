import { Module } from '@nestjs/common';
import { MovementListener } from './movement.listener';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { AlertsModule } from 'src/alerts/alerts.module';

@Module({
  imports: [AnalyticsModule, AlertsModule],
  providers: [MovementListener],
})
export class EventsModule {}
