import { Module } from '@nestjs/common';
import { SkusService } from './skus.service';
import { SkusController } from './skus.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sku } from './entities/skus.entity';
import { ProductVariant } from 'src/product-variants/entities/product-variant.entity';
import { Lot } from 'src/lots/entities/lot.entity';
import { Stock } from 'src/stocks/entities/stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sku, ProductVariant, Lot, Stock])],
  controllers: [SkusController],
  providers: [SkusService],
})
export class SkusModule {}
