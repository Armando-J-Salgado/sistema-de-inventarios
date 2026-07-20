import { Module } from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service';
import { ProductVariantsController } from './product-variants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from 'src/products/entities/product.entity';
import { Alert } from 'src/alerts/entities/alert.entity';
import { Sku } from 'src/skus/entities/skus.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductVariant, Product, Alert, Sku])
  ],
  controllers: [ProductVariantsController],
  providers: [ProductVariantsService],
})
export class ProductVariantsModule {}
