import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Movement } from 'src/movements/entities/movement.entity';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { AlertsService } from 'src/alerts/alerts.service';

@Injectable()
export class MovementListener {
  private readonly logger = new Logger(MovementListener.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly alertsService: AlertsService,
  ) {}

  @OnEvent('movement.created')
  async handleMovementCreated(movement: Movement) {
    try {
      this.logger.log(`Processing movement.created event for movement ID: ${movement.id}`);

      // 1. Get all variants that currently need reordering globally
      const needReorderItems = await this.analyticsService.getGlobalNeedReorder();

      // 2. Process each item to ensure an active alert exists
      for (const item of needReorderItems) {
        const productVariantId = item.productVariantId;

        // 3. Create a new alert if none exists
        await this.alertsService.evaluateAndGenerate(productVariantId);
        this.logger.log(`Created new reorder alert for Product Variant ID: ${productVariantId}`);
      }

    } catch (error: any) {
      // We catch the error so it doesn't crash the main HTTP request, as this is a background task
      this.logger.error(`Error processing movement.created event: ${error.message}`, error.stack);
    }
  }
}
