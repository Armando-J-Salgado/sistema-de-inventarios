import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../src/categories/categories.module';
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
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../src/jwt/jwt.strategy';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { App } from 'supertest/types';

dotenv.config({ path: path.resolve(__dirname, '../.env.testing') });

jest.setTimeout(30000);

describe('CategoriesModule (e2e)', () => {
  let app: INestApplication<App>;
  let categoryRepo: Repository<Category>;
  let jwtService: JwtService;

  let adminToken: string;
  let employeeToken: string;
  let seededCategory: Category;

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
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.SECRET_KEY,
          signOptions: { expiresIn: '1h' },
        }),
        CategoriesModule,
      ],
      providers: [JwtStrategy],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    categoryRepo = moduleFixture.get<Repository<Category>>(getRepositoryToken(Category));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    adminToken = jwtService.sign({ sub: 1, email: 'admin@test.com', roles: 'ADMINISTRATOR' });
    employeeToken = jwtService.sign({ sub: 2, email: 'employee@test.com', roles: 'EMPLOYEE' });

    // Clean test categories if existing
    await categoryRepo.delete({ name: 'Initial Category' });
    await categoryRepo.delete({ name: 'Red Wines' });
    await categoryRepo.delete({ name: 'Updated Initial Category' });
    await categoryRepo.delete({ name: 'Inactive Category' });

    seededCategory = await categoryRepo.save({
      name: 'Initial Category',
      active: true,
    });
  });

  afterAll(async () => {
    if (categoryRepo) {
      await categoryRepo.delete({ name: 'Initial Category' });
      await categoryRepo.delete({ name: 'Red Wines' });
      await categoryRepo.delete({ name: 'Updated Initial Category' });
      await categoryRepo.delete({ name: 'Inactive Category' });
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /categories', () => {
    it('should return 401 Unauthorized when no auth token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'Wine' });

      expect(response.status).toBe(401);
    });

    it('should return 403 Forbidden when standard employee token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Wine' });

      expect(response.status).toBe(403);
    });

    it('should return 400 Bad Request for empty category name', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
    });

    it('should return 400 Bad Request for name shorter than 2 chars', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'A' });

      expect(response.status).toBe(400);
    });

    it('should return 400 Bad Request for numeric name', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 123 });

      expect(response.status).toBe(400);
    });

    it('should return 400 Bad Request for missing name field', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 201 Created and create category with unique name', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Red Wines' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Red Wines');
      expect(response.body.active).toBe(true);
    });

    it('should return 409 Conflict when category name already exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Red Wines' });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Category name already exists');
    });
  });

  describe('GET /categories', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app.getHttpServer()).get('/categories');
      expect(response.status).toBe(401);
    });

    it('should return 200 OK and list of categories for valid employee token', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 200 OK and filter only active categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories?active=true')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.every((c: any) => c.active === true)).toBe(true);
    });

    it('should return 200 OK and filter only inactive categories', async () => {
      await categoryRepo.save({ name: 'Inactive Category', active: false });

      const response = await request(app.getHttpServer())
        .get('/categories?active=false')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.every((c: any) => c.active === false)).toBe(true);
    });
  });

  describe('GET /categories/:id', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app.getHttpServer()).get(`/categories/${seededCategory.id}`);
      expect(response.status).toBe(401);
    });

    it('should return 200 OK and category for valid ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${seededCategory.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(seededCategory.id);
      expect(response.body.name).toBe('Initial Category');
    });

    it('should return 404 Not Found for non-existent ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories/999999')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /categories/:id', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${seededCategory.id}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(401);
    });

    it('should return 403 Forbidden for non-admin employee', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${seededCategory.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(403);
    });

    it('should return 404 Not Found for non-existent ID', async () => {
      const response = await request(app.getHttpServer())
        .patch('/categories/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Name' });

      expect(response.status).toBe(404);
    });

    it('should return 200 OK and update category for valid request', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${seededCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Initial Category' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Initial Category');
    });

    it('should return 409 Conflict when updating to an existing category name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${seededCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Red Wines' });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const response = await request(app.getHttpServer()).delete(`/categories/${seededCategory.id}`);
      expect(response.status).toBe(401);
    });

    it('should return 403 Forbidden for non-admin employee', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/categories/${seededCategory.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 Not Found for non-existent ID', async () => {
      const response = await request(app.getHttpServer())
        .delete('/categories/999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 200 OK and set category active flag to false', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/categories/${seededCategory.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(false);

      const checkResponse = await request(app.getHttpServer())
        .get(`/categories/${seededCategory.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(checkResponse.body.active).toBe(false);
    });
  });
});
