import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { SeederRunnerService } from './seeder-runner.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { Lot } from '../lots/entities/lot.entity';
import { Sku } from '../skus/entities/skus.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Category, Provider, Employee, Product, ProductVariant, Lot, Sku, Warehouse]),
    ],
    providers: [
        SeederService, SeederRunnerService
    ]
})
export class SeederModule {}
