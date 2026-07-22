import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthModule } from '../src/auth/auth.module';
import { LotsModule } from '../src/lots/lots.module';
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
import { LotState } from '../src/lots/enums/lot-state.enum';

dotenv.config({ path: path.resolve(__dirname, '../.env.testing') });

jest.setTimeout(30000);

describe('LotsModule (e2e)', () => {
  let app: INestApplication<App>;
  let employeeRepo: Repository<Employee>;
  let providerRepo: Repository<Provider>;
  let categoryRepo: Repository<Category>;
  let productRepo: Repository<Product>;
  let productVariantRepo: Repository<ProductVariant>;
  let lotRepo: Repository<Lot>;
  let skuRepo: Repository<Sku>;
  let adminToken: string;
  let analystToken: string;
  let provider: Provider;
  let seededLot: Lot;
  let category: Category;
  let product: Product;
  let productVariant: ProductVariant;

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
        LotsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    employeeRepo = moduleFixture.get<Repository<Employee>>(getRepositoryToken(Employee));
    providerRepo = moduleFixture.get<Repository<Provider>>(getRepositoryToken(Provider));
    categoryRepo = moduleFixture.get<Repository<Category>>(getRepositoryToken(Category));
    productRepo = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    productVariantRepo = moduleFixture.get<Repository<ProductVariant>>(getRepositoryToken(ProductVariant));
    lotRepo = moduleFixture.get<Repository<Lot>>(getRepositoryToken(Lot));
    skuRepo = moduleFixture.get<Repository<Sku>>(getRepositoryToken(Sku));

    await skuRepo.delete({ id: 'LOT-E2E-SKU-1' });
    await lotRepo.delete({ id: 0 });
    await productVariantRepo.delete({ name: 'Sparkling Water 500ml' });
    await productRepo.delete({ name: 'Sparkling Water' });
    await providerRepo.delete({ email: 'lot-provider@test.com' });
    await categoryRepo.delete({ name: 'Beverages' });
    await employeeRepo.delete({ email: 'lot-admin@test.com' });
    await employeeRepo.delete({ email: 'lot-analyst@test.com' });

    const adminPassword = await bcrypt.hash('ValidPass1!', 10);
    const analystPassword = await bcrypt.hash('ValidPass1!', 10);

    await employeeRepo.save([
      {
        email: 'lot-admin@test.com',
        password: adminPassword,
        name: 'Lot Admin',
        address: 'Admin Street',
        role: 'ADMINISTRATOR',
        active: true,
      },
      {
        email: 'lot-analyst@test.com',
        password: analystPassword,
        name: 'Lot Analyst',
        address: 'Analyst Street',
        role: 'ANALYST',
        active: true,
      },
    ]);

    category = await categoryRepo.save({
      name: 'Beverages',
      active: true,
    });

    provider = await providerRepo.save({
      name: 'Lot Provider',
      address: 'Provider Ave 123',
      email: 'lot-provider@test.com',
      active: true,
    });

    product = await productRepo.save({
      name: 'Sparkling Water',
      unitOfMeasurement: 'bottles',
      active: true,
      category,
      provider,
    });

    productVariant = await productVariantRepo.save({
      name: 'Sparkling Water 500ml',
      description: '500ml bottle',
      reorderPoint: 10,
      active: true,
      product,
    });

    seededLot = await lotRepo.save({
      provider,
      providerId: provider.id,
      dateOfEntry: new Date('2026-07-22T10:00:00.000Z'),
      state: LotState.RECEIVED,
      active: true,
    });

    await skuRepo.save({
      id: 'LOT-E2E-SKU-1',
      quantity: 24,
      unitCost: 2.75,
      active: true,
      lot: seededLot,
      productVariant,
    });

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'lot-admin@test.com', password: 'ValidPass1!' });
    adminToken = adminLogin.body.access_token;

    const analystLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'lot-analyst@test.com', password: 'ValidPass1!' });
    analystToken = analystLogin.body.access_token;
  });

  afterAll(async () => {
    if (skuRepo) {
      await skuRepo.delete({ id: 'LOT-E2E-SKU-1' });
    }
    if (lotRepo && seededLot) {
      await lotRepo.delete({ id: seededLot.id });
    }
    if (productVariantRepo && productVariant) {
      await productVariantRepo.delete({ id: productVariant.id });
    }
    if (productRepo && product) {
      await productRepo.delete({ id: product.id });
    }
    if (providerRepo && provider) {
      await providerRepo.delete({ id: provider.id });
    }
    if (categoryRepo && category) {
      await categoryRepo.delete({ id: category.id });
    }
    if (employeeRepo) {
      await employeeRepo.delete({ email: 'lot-admin@test.com' });
      await employeeRepo.delete({ email: 'lot-analyst@test.com' });
    }
    if (app) {
      await app.close();
    }
  });

  it('returns 401 when requesting lots without auth', async () => {
    const response = await request(app.getHttpServer()).get('/lots');

    expect(response.status).toBe(401);
  });

  it('returns 403 when analyst tries to create a lot', async () => {
    const response = await request(app.getHttpServer())
      .post('/lots')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        providerId: provider.id,
        dateOfEntry: '2026-07-22T10:00:00.000Z',
        state: LotState.RECEIVED,
      });

    expect(response.status).toBe(403);
  });

  it('returns 400 for invalid create payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/lots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: -1,
        dateOfEntry: 'not-a-date',
      });

    expect(response.status).toBe(400);
  });

  it('returns 404 when provider does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/lots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: 999999,
        dateOfEntry: '2026-07-22T10:00:00.000Z',
        state: LotState.RECEIVED,
      });

    expect(response.status).toBe(404);
  });

  it('creates a valid lot', async () => {
    const response = await request(app.getHttpServer())
      .post('/lots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        providerId: provider.id,
        dateOfEntry: '2026-07-22T12:00:00.000Z',
        state: LotState.PENDING,
      });

    expect(response.status).toBe(201);
    expect(response.body.providerId).toBe(provider.id);
    expect(response.body.state).toBe(LotState.PENDING);
  });

  it('returns filtered lots', async () => {
    const response = await request(app.getHttpServer())
      .get(`/lots?providerId=${provider.id}&state=${LotState.RECEIVED}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((lot: { id: number }) => lot.id === seededLot.id)).toBe(true);
  });

  it('returns 409 when deactivating a lot with skus', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/lots/${seededLot.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(409);
  });
});