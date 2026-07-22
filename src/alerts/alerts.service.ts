import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from './entities/alert.entity';
import { ProductVariant } from 'src/product-variants/entities/product-variant.entity';
import { StocksService } from 'src/stocks/stocks.service';

const ALERT_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly stocksService: StocksService,
  ) {}

  async findAll(): Promise<Alert[]> {
    return await this.alertRepository.find();
  }

  async findOne(id: number): Promise<Alert> {
    const alert = await this.alertRepository.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException(`The alert with id #${id} could not be found`);
    }
    return alert;
  }

  async evaluateAndGenerate(variantId: number): Promise<Alert | null> {
    const variant = await this.variantRepository.findOne({ where: { id: variantId } });
    if (!variant) {
      throw new NotFoundException(`The product variant with id #${variantId} could not be found`);
    }
    if (!variant.active) {
      return null;
    }

    const available = await this.stocksService.getAvailableByVariantWarehouse(variantId);
    if (available > variant.reorderPoint) {
      return null;
    }

    const recentAlert = await this.alertRepository.findOne({
      where: { productVariant: { id: variantId } },
      order: { createdAt: 'DESC' },
    });
    if (recentAlert && Date.now() - recentAlert.createdAt.getTime() < ALERT_DEDUPE_WINDOW_MS) {
      return null;
    }

    const alert = this.alertRepository.create({
      title: `Low stock of ${variant.name}`,
      description: `Available quantity (${available}) is at or below the reorder point (${variant.reorderPoint})`,
      productVariant: variant,
    });
    return await this.alertRepository.save(alert);
  }
}
