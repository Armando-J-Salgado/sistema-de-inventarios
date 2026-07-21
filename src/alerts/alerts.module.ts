import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';
import { ProductVariant } from 'src/product-variants/entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, ProductVariant])
  ],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
