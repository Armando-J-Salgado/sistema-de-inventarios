import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Movement } from 'src/movements/entities/movement.entity';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { AlertsService } from 'src/alerts/alerts.service';

@Injectable()
export class MovementListener {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly alertsService: AlertsService,
  ) {}

  @OnEvent('movement.created')
  handleMovementCreated(movement: Movement) {
    this.analyticsService.calculateRotation(movement.id);
    this.alertsService.findAll();
  }
}
