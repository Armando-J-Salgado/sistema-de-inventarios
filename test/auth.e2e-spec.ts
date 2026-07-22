import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../src/auth/auth.module';
import { Category } from '../src/categories/entities/category.entity';
import { Provider } from '../src/providers/entities/provider.entity';
import { Product } from '../src/products/entities/product.entity';
import { ProductVariant } from '../src/product-variants/entities/product-variant.entity';
import { Lot } from '../src/lots/entities/lot.entity';
import { Employee } from '../src/employees/entities/employee.entity';
import { Sku } from '../src/skus/entities/skus.entity';
import { Alert } from '../src/alerts/entities/alert.entity';
import { Stock } from '../src/stocks/entities/stock.entity';
import { Reservation } from '../src/reservations/entities/reservation.entity';
import { Movement } from '../src/movements/entities/movement.entity';
import { Warehouse } from '../src/warehouses/entities/warehouse.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { App } from 'supertest/types';

dotenv.config({ path: path.resolve(__dirname, '../.env.testing') });

jest.setTimeout(30000);

describe('AuthModule (e2e)', () => {
  let app: INestApplication<App>;
  let employeeRepo: Repository<Employee>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST ?? 'localhost',
          port: Number(process.env.DB_PORT) ?? 5432,
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          entities: [Category, Provider, Product, ProductVariant, Lot, Employee, Sku, Alert, Stock, Reservation, Movement, Warehouse],
          synchronize: true,
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    employeeRepo = moduleFixture.get<Repository<Employee>>(getRepositoryToken(Employee));

    // Clean test employees if previously existing
    await employeeRepo.delete({ email: 'admin@test.com' });
    await employeeRepo.delete({ email: 'inactive@test.com' });

    const activeHashedPassword = await bcrypt.hash('ValidPass1!', 10);
    await employeeRepo.save({
      email: 'admin@test.com',
      password: activeHashedPassword,
      name: 'Test Admin',
      address: '123 Main St',
      role: 'ADMINISTRATOR',
      active: true,
    });

    const inactiveHashedPassword = await bcrypt.hash('ValidPass1!', 10);
    await employeeRepo.save({
      email: 'inactive@test.com',
      password: inactiveHashedPassword,
      name: 'Inactive Employee',
      address: '456 Side St',
      role: 'EMPLOYEE',
      active: false,
    });
  });

  afterAll(async () => {
    if (employeeRepo) {
      await employeeRepo.delete({ email: 'admin@test.com' });
      await employeeRepo.delete({ email: 'inactive@test.com' });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /auth/login', () => {
    it('should return 400 Bad Request when request body is empty', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 Bad Request when email format is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'ValidPass1!' });

      expect(response.status).toBe(400);
    });

    it('should return 400 Bad Request when password field is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com' });

      expect(response.status).toBe(400);
    });

    it('should return 400 Bad Request when email is empty string', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: '', password: 'ValidPass1!' });

      expect(response.status).toBe(400);
    });

    it('should return 401 Unauthorized for incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'WrongPassword!' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 Unauthorized for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@test.com', password: 'ValidPass1!' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 Unauthorized for inactive employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'inactive@test.com', password: 'ValidPass1!' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 201 Created with access_token on valid login', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'ValidPass1!' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('access_token');
      expect(typeof response.body.access_token).toBe('string');

      const tokenParts = response.body.access_token.split('.');
      expect(tokenParts.length).toBe(3);

      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      expect(payload.email).toBe('admin@test.com');
      expect(payload.roles).toBe('ADMINISTRATOR');
      expect(payload.sub).toBeDefined();
    });
  });
});
