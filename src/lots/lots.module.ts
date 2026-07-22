import { Module } from '@nestjs/common';
import { LotsService } from './lots.service';
import { LotsController } from './lots.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lot } from './entities/lot.entity';
import { Provider } from 'src/providers/entities/provider.entity';
import { Sku } from 'src/skus/entities/skus.entity';
import { Category } from 'src/categories/entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lot, Provider, Sku, Category])],
  controllers: [LotsController],
  providers: [LotsService],
  exports: [LotsService, TypeOrmModule],
})
export class LotsModule {}
