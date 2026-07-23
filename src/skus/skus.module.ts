import { Module } from '@nestjs/common';
import { SkusService } from './skus.service';
import { SkusController } from './skus.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sku } from './entities/skus.entity';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { Lot } from '../lots/entities/lot.entity';
import { Stock } from '../stocks/entities/stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sku, ProductVariant, Lot, Stock])],
  controllers: [SkusController],
  providers: [SkusService],
  exports: [SkusService],
})
export class SkusModule {}
