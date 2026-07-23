import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { App } from 'supertest/types';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SkusModule } from '../src/skus/skus.module';
import { JwtStrategy } from '../src/jwt/jwt.strategy';
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

dotenv.config({ path: path.resolve(__dirname, '../.env.testing') });

process.env.SECRET_KEY = process.env.SECRET_KEY || 'test-secret-sku';

jest.setTimeout(30000);

describe('SkusModule (e2e)', () => {
  let app: INestApplication<App>;
  let skuRepo: Repository<Sku>;
  let stockRepo: Repository<Stock>;
  let providerRepo: Repository<Provider>;
  let categoryRepo: Repository<Category>;
  let productRepo: Repository<Product>;
  let productVariantRepo: Repository<ProductVariant>;
  let lotRepo: Repository<Lot>;
  let warehouseRepo: Repository<Warehouse>;
  let jwtService: JwtService;

  let adminToken: string;
  let analystToken: string;
  let seededSku: Sku;

  const suffix = Date.now();
  const providerEmail = `provider-${suffix}@test.com`;

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
        SkusModule,
        TypeOrmModule.forFeature([Provider, Category, Product, Warehouse]),
      ],
      providers: [JwtStrategy],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    skuRepo = moduleFixture.get<Repository<Sku>>(getRepositoryToken(Sku));
    stockRepo = moduleFixture.get<Repository<Stock>>(getRepositoryToken(Stock));
    providerRepo = moduleFixture.get<Repository<Provider>>(getRepositoryToken(Provider));
    categoryRepo = moduleFixture.get<Repository<Category>>(getRepositoryToken(Category));
    productRepo = moduleFixture.get<Repository<Product>>(getRepositoryToken(Product));
    productVariantRepo = moduleFixture.get<Repository<ProductVariant>>(getRepositoryToken(ProductVariant));
    lotRepo = moduleFixture.get<Repository<Lot>>(getRepositoryToken(Lot));
    warehouseRepo = moduleFixture.get<Repository<Warehouse>>(getRepositoryToken(Warehouse));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await stockRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await skuRepo.createQueryBuilder().delete().where('id LIKE :prefix', { prefix: `SKU-E2E-${suffix}%` }).execute();
    await lotRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await productVariantRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await productRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await categoryRepo.createQueryBuilder().delete().where('1 = 1').execute();
    await providerRepo.createQueryBuilder().delete().where('email = :email', { email: providerEmail }).execute();
    await warehouseRepo.createQueryBuilder().delete().where('name = :name', { name: `SKU Warehouse ${suffix}` }).execute();

    const category = await categoryRepo.save({ name: `SKU Category ${suffix}`, active: true });
    const provider = await providerRepo.save({
      name: `SKU Provider ${suffix}`,
      address: 'Main Street 123',
      email: providerEmail,
      active: true,
    });
    const product = await productRepo.save({
      name: `SKU Product ${suffix}`,
      unitOfMeasurement: 'Bottles',
      active: true,
      category,
      provider,
    });
    const productVariant = await productVariantRepo.save({
      name: `SKU Variant ${suffix}`,
      description: 'Variant for SKU tests',
      reorderPoint: 5,
      active: true,
      product,
    });
    const lot = await lotRepo.save({
      provider,
      providerId: provider.id,
      dateOfEntry: new Date('2026-07-22T00:00:00.000Z'),
      state: 'RECEIVED',
      active: true,
    });
    const warehouse = await warehouseRepo.save({
      name: `SKU Warehouse ${suffix}`,
      maximumCapacity: 100,
      availableCapacity: 100,
      active: true,
    });

    seededSku = await skuRepo.save({
      id: `SKU-E2E-${suffix}-1`,
      dateOfEntry: new Date('2026-07-22T00:00:00.000Z'),
      quantity: 10,
      unitCost: 11.5,
      bestBeforeDate: new Date('2026-08-22T00:00:00.000Z'),
      active: true,
      lot,
      productVariant,
    });

    await stockRepo.save({
      quantity: 10,
      active: true,
      sku: seededSku,
      warehouse,
    });

    adminToken = jwtService.sign({ sub: 1, email: 'admin@test.com', roles: 'ADMINISTRATOR' });
    analystToken = jwtService.sign({ sub: 2, email: 'analyst@test.com', roles: 'ANALYST' });
  });

  afterAll(async () => {
    if (stockRepo) {
      await stockRepo.createQueryBuilder().delete().where('1 = 1').execute();
    }
    if (skuRepo) {
      await skuRepo.createQueryBuilder().delete().where('1 = 1').execute();
    }
    if (lotRepo) {
      await lotRepo.createQueryBuilder().delete().where('1 = 1').execute();
    }
    if (productVariantRepo) {
      await productVariantRepo.createQueryBuilder().delete().where('1 = 1').execute();
    }
    if (productRepo) {
      await productRepo.createQueryBuilder().delete().where('1 = 1').execute();
    }
    if (categoryRepo) {
      await categoryRepo.createQueryBuilder().delete().where('1 = 1').execute();
    }
    if (providerRepo) {
      await providerRepo.createQueryBuilder().delete().where('email = :email', { email: providerEmail }).execute();
    }
    if (warehouseRepo) {
      await warehouseRepo.createQueryBuilder().delete().where('name = :name', { name: `SKU Warehouse ${suffix}` }).execute();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /skus', () => {
    it('returns 401 without a token', async () => {
      const response = await request(app.getHttpServer())
        .post('/skus')
        .send({
          lotId: seededSku.lot?.id ?? 1,
          productVariantId: seededSku.productVariant?.id ?? 1,
          dateOfEntry: '2026-07-22T00:00:00.000Z',
          quantity: 4,
          unitCost: 9.5,
          bestBeforeDate: '2026-08-22T00:00:00.000Z',
        });

      expect(response.status).toBe(401);
    });

    it('returns 403 for non administrator roles', async () => {
      const response = await request(app.getHttpServer())
        .post('/skus')
        .set('Authorization', `Bearer ${analystToken}`)
        .send({
          lotId: seededSku.lot?.id ?? 1,
          productVariantId: seededSku.productVariant?.id ?? 1,
          dateOfEntry: '2026-07-22T00:00:00.000Z',
          quantity: 4,
          unitCost: 9.5,
          bestBeforeDate: '2026-08-22T00:00:00.000Z',
        });

      expect(response.status).toBe(403);
    });

    it('creates a valid sku with an auto-generated id for administrators', async () => {
      // The id is generated server-side as VARIETAL-AÑADA-LOTE
      // e.g. first 4 alpha chars of variant name + year of lot.dateOfEntry + 'L' + padded lot id
      const response = await request(app.getHttpServer())
        .post('/skus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          lotId: seededSku.lot?.id ?? 1,
          productVariantId: seededSku.productVariant?.id ?? 1,
          dateOfEntry: '2026-07-22T00:00:00.000Z',
          quantity: 4,
          unitCost: 9.5,
          bestBeforeDate: '2026-08-22T00:00:00.000Z',
        });

      // Verify the server auto-generated the id (VARIETAL-YEAR-LXXX pattern)
      expect(response.status).toBe(201);
      expect(response.body.id).toMatch(/^[A-Z]{4}-\d{4}-L\d{4}$/);
      expect(response.body.active).toBe(true);
    });
  });

  describe('GET /skus', () => {
    it('returns 401 without a token', async () => {
      const response = await request(app.getHttpServer()).get('/skus');
      expect(response.status).toBe(401);
    });

    it('returns the existing skus for an authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/skus')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((sku: any) => sku.id === seededSku.id)).toBe(true);
    });
  });

  describe('GET /skus/:id', () => {
    it('returns the sku when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/skus/${seededSku.id}`)
        .set('Authorization', `Bearer ${analystToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(seededSku.id);
    });
  });

  describe('PATCH /skus/:id', () => {
    it('updates the sku for administrators', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/skus/${seededSku.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 15 });

      expect(response.status).toBe(200);
      expect(response.body.quantity).toBe(15);
    });
  });

  describe('DELETE /skus/:id', () => {
    it('soft deletes the sku and deactivates related stocks', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/skus/${seededSku.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(false);

      const stock = await stockRepo.findOne({ where: { sku: { id: seededSku.id } } });
      expect(stock?.active).toBe(false);
    });
  });
});