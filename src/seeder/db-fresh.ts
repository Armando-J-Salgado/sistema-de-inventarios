import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const dataSource = app.get(DataSource);

  await dataSource.dropDatabase();
  await dataSource.synchronize();

  console.log('Database recreated');

  await app.close();
}

bootstrap();