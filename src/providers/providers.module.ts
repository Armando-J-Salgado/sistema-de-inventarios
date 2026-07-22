import { Module } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { Product } from '../products/entities/product.entity';
import { Lot } from '../lots/entities/lot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, Product, Lot])],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}
