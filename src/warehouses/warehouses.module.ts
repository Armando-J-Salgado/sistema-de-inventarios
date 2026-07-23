import { Module } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { WarehousesController } from './warehouses.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Stock } from '../stocks/entities/stock.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse, Employee, Stock])],
  controllers: [WarehousesController],
  providers: [WarehousesService],
})
export class WarehousesModule {}
