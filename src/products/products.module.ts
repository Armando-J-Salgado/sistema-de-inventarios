import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Provider } from 'src/providers/entities/provider.entity';
import { ProductVariant } from 'src/product-variants/entities/product-variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, Provider, ProductVariant])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
