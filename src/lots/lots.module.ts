import { Module } from '@nestjs/common';
import { LotsService } from './lots.service';
import { LotsController } from './lots.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lot } from './entities/lot.entity';
import { Provider } from 'src/providers/entities/provider.entity';
import { Sku } from 'src/skus/entities/skus.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lot, Provider, Sku])
  ],
  controllers: [LotsController],
  providers: [LotsService],
})
export class LotsModule {}
