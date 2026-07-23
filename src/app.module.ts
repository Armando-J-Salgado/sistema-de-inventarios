import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import 'dotenv/config';
import {TypeOrmModule} from '@nestjs/typeorm';
import { CategoriesModule } from './categories/categories.module';
import { ProvidersModule } from './providers/providers.module';
import { EmployeesModule } from './employees/employees.module';
import { ProductsModule } from './products/products.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { LotsModule } from './lots/lots.module';
import { SkusModule } from './skus/skus.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { AlertsModule } from './alerts/alerts.module';
import { StocksModule } from './stocks/stocks.module';
import { ReservationsModule } from './reservations/reservations.module';
import { MovementsModule } from './movements/movements.module';
import { Category } from './categories/entities/category.entity';
import { Provider } from './providers/entities/provider.entity';
import { Product } from './products/entities/product.entity';
import { ProductVariant } from './product-variants/entities/product-variant.entity';
import { Lot } from './lots/entities/lot.entity';
import { Employee } from './employees/entities/employee.entity';
import { Sku } from './skus/entities/skus.entity';
import { Alert } from './alerts/entities/alert.entity';
import { Stock } from './stocks/entities/stock.entity';
import { Reservation } from './reservations/entities/reservation.entity';
import { Movement } from './movements/entities/movement.entity';
import { Warehouse } from './warehouses/entities/warehouse.entity';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EventsModule } from './events/events.module';
import { CommonModule } from './common/common.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SeederService } from './seeder/seeder.service';
import { SeederModule } from './seeder/seeder.module';
import { SeederRunnerService } from './seeder/seeder-runner.service';

@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) ?? 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Category, Provider, Product, ProductVariant, Lot, Employee, Sku, Alert, Stock, Reservation, Movement, Warehouse],
    synchronize: true,
  }), EventEmitterModule.forRoot(), CategoriesModule, ProvidersModule, EmployeesModule, ProductsModule, ProductVariantsModule, LotsModule, SkusModule, WarehousesModule, AlertsModule, StocksModule, ReservationsModule, MovementsModule, AuthModule, AnalyticsModule, EventsModule, CommonModule, SeederModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
