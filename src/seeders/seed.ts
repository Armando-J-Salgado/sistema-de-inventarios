import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from 'src/app.module';
import { SeederService } from './seeder.service';
import { Employee } from 'src/employees/entities/employee.entity';
import { Provider } from 'src/providers/entities/provider.entity';
import { Product } from 'src/products/entities/product.entity';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { CategoriesService } from 'src/categories/categories.service';
import { ProductVariantsService } from 'src/product-variants/product-variants.service';
import { LotsService } from 'src/lots/lots.service';
import { SkusService } from 'src/skus/skus.service';
import { WarehousesService } from 'src/warehouses/warehouses.service';
import { MovementsService } from 'src/movements/movements.service';
import { ReservationsService } from 'src/reservations/reservations.service';

async function bootstrap(): Promise<void> {
  const fresh = process.argv.includes('--fresh');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const seeder = new SeederService(
      app.get(DataSource),
      app.get(getRepositoryToken(Employee)),
      app.get(getRepositoryToken(Provider)),
      app.get(getRepositoryToken(Product)),
      app.get(CategoriesService),
      app.get(ProductVariantsService),
      app.get(LotsService),
      app.get(SkusService),
      app.get(WarehousesService),
      app.get(MovementsService),
      app.get(ReservationsService),
      app.get(getRepositoryToken(Stock)),
      app.get(getRepositoryToken(Movement)),
      app.get(getRepositoryToken(Reservation)),
    );

    await seeder.run({ fresh });
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
