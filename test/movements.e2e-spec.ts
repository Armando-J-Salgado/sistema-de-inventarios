import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovementsModule } from '../src/movements/movements.module';
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
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { App } from 'supertest/types';
import {
  MovementType,
  ReceiveDecision,
  MovementStatus,
} from '../src/enums/movement-type.enum';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LotState } from 'src/lots/enums/lot-state.enum';

dotenv.config({ path: path.resolve(__dirname, '../.env.testing') });

jest.setTimeout(30000);

const SAFE_TRANSFER_GROUP_ID = 1_000_000;

async function withSafeTransferGroupId<T>(fn: () => Promise<T>): Promise<T> {
  const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(SAFE_TRANSFER_GROUP_ID);

  try {
    return await fn();
  } finally {
    dateNowSpy.mockRestore();
  }
}

describe('MovementsModule (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let dataSource: DataSource;

  let warehouseRepo: Repository<Warehouse>;
  let employeeRepo: Repository<Employee>;
  let skuRepo: Repository<Sku>;
  let productVariantRepo: Repository<ProductVariant>;
  let productRepo: Repository<Product>;
  let categoryRepo: Repository<Category>;
  let reservationRepo: Repository<Reservation>;
  let stockRepo: Repository<Stock>;
  let movementRepo: Repository<Movement>;
  let lotRepo: Repository<Lot>;
  let providerRepo: Repository<Provider>;

  let adminToken: string;
  let employeeToken: string;

  let originWarehouse: Warehouse;
  let destWarehouse: Warehouse;
  let adminEmployee: Employee;
  let sku: Sku;
  let variant: ProductVariant;
  let activeReservation: Reservation;
  let existingStock: Stock;
  let pendingTransferGroupId: string;

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
          entities: [
            Category,
            Provider,
            Product,
            ProductVariant,
            Lot,
            Employee,
            Sku,
            Alert,
            Stock,
            Reservation,
            Movement,
            Warehouse,
          ],
          synchronize: true,
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.SECRET_KEY,
          signOptions: { expiresIn: '1h' },
        }),
        MovementsModule,
        EventEmitterModule.forRoot(),
        TypeOrmModule.forFeature([
          Category,
          Provider,
          Product,
          ProductVariant,
          Lot,
          Employee,
          Sku,
          Alert,
          Stock,
          Reservation,
          Movement,
          Warehouse,
        ]),
      ],
      providers: [JwtStrategy],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

// 2. Get repositories
    jwtService = moduleFixture.get<JwtService>(JwtService);
    movementRepo = moduleFixture.get(getRepositoryToken(Movement));
    reservationRepo = moduleFixture.get(getRepositoryToken(Reservation));
    stockRepo = moduleFixture.get(getRepositoryToken(Stock));
    skuRepo = moduleFixture.get(getRepositoryToken(Sku));
    lotRepo = moduleFixture.get(getRepositoryToken(Lot));
    employeeRepo = moduleFixture.get(getRepositoryToken(Employee));
    warehouseRepo = moduleFixture.get(getRepositoryToken(Warehouse));
    productVariantRepo = moduleFixture.get(getRepositoryToken(ProductVariant));
    productRepo = moduleFixture.get(getRepositoryToken(Product));
    categoryRepo = moduleFixture.get(getRepositoryToken(Category));
    providerRepo = moduleFixture.get(getRepositoryToken(Provider));

    // 3. SAFE CLEANUP: Hard delete only the data this test file cares about
    await movementRepo.createQueryBuilder().delete().execute();
    await reservationRepo.createQueryBuilder().delete().execute();
    await stockRepo.createQueryBuilder().delete().execute();
    await skuRepo.createQueryBuilder().delete().execute();
    await lotRepo.createQueryBuilder().delete().execute();
    await productVariantRepo.createQueryBuilder().delete().execute();
    await productRepo.createQueryBuilder().delete().execute();
    await categoryRepo.createQueryBuilder().delete().execute();
    await providerRepo.createQueryBuilder().delete().execute();
    
    // Use LIKE to safely catch any test variants/employees from previous crashed runs
    await employeeRepo.createQueryBuilder().delete().where('email LIKE :email', { email: '%test.com' }).execute();
    await warehouseRepo.createQueryBuilder().delete().where('name LIKE :name', { name: '%WH' }).execute();

    adminEmployee = await employeeRepo.save({
      name: 'Admin User',
      address: '123 Admin Rd',
      email: 'admin.movements@test.com',
      password: 'hash',
      role: 'ADMINISTRATOR',
      active: true,
    });

    originWarehouse = await warehouseRepo.save({
      name: 'Origin WH',
      maximumCapacity: 1000,
      availableCapacity: 900,
      active: true,
    });

    destWarehouse = await warehouseRepo.save({
      name: 'Dest WH',
      maximumCapacity: 500,
      availableCapacity: 500,
      active: true,
    });

    variant = await productVariantRepo.save({
      name: 'Test Variant',
      description: 'Test description',
      reorderPoint: 20,
    });

    const provider = await providerRepo.save({
      name: 'TEST PROVIDER',
      address: 'TEST ADDRESS',
      email: 'arjsalgado@mail.com',
    })

    const lot = await lotRepo.save({
      state: LotState.RECEIVED,
      dateOfEntry: new Date(),
      providerId: provider.id
    });

    sku = await skuRepo.save({
      id: 'SKU-TEST-1',
      unitCost: 5,
      quantity: 100, // lot quantity uncommitted
      lot,
      productVariant: variant,
      bestBeforeDate: new Date(Date.now() + 100000000),
      dateOfEntry: new Date(),
    });

    existingStock = await stockRepo.save({
      sku,
      warehouse: originWarehouse,
      quantity: 50,
      active: true,
    });

    activeReservation = await reservationRepo.save({
      stock: existingStock,
      quantity: 10,
      status: 'ACTIVE',
      fromDate: new Date(),
      toDate: new Date(Date.now() + 86400000), // +1 day
    });

    adminToken = jwtService.sign({
      sub: adminEmployee.id,
      email: adminEmployee.email,
      roles: 'ADMINISTRATOR',
    });
    employeeToken = jwtService.sign({
      sub: 99,
      email: 'emp@test.com',
      roles: 'ANALYST',
    }); // Unprivileged
  });

  afterEach(async () => {
    // Clean movements to keep isolated state for test scenarios, but keep base seed data
    await movementRepo.createQueryBuilder().delete().execute();
  });

  afterAll(async () => {
    await movementRepo.createQueryBuilder().delete().execute();
    await reservationRepo.createQueryBuilder().delete().execute();
    await stockRepo.createQueryBuilder().delete().execute();
    await skuRepo.createQueryBuilder().delete().execute();

    // Hard delete to prevent soft-delete ghost data from breaking future runs
    await warehouseRepo
      .createQueryBuilder()
      .delete()
      .where('name IN (:...names)', { names: ['Origin WH', 'Dest WH'] })
      .execute();
    await employeeRepo
      .createQueryBuilder()
      .delete()
      .where('email = :email', { email: 'admin.movements@test.com' })
      .execute();
    await productVariantRepo
      .createQueryBuilder()
      .delete()
      .execute();

    await lotRepo.createQueryBuilder().delete().execute();
    await productRepo.createQueryBuilder().delete().execute();
    await categoryRepo.createQueryBuilder().delete().execute();
    await providerRepo.createQueryBuilder().delete().execute();
    await app.close();
  });

  describe('POST /movements/entry', () => {
    it('returns 401 when no token', async () => {
      const res = await request(app.getHttpServer())
        .post('/movements/entry')
        .send({});
      expect(res.status).toBe(401);
    });

    it('returns 403 when wrong role', async () => {
      const res = await request(app.getHttpServer())
        .post('/movements/entry')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('returns 400 when missing body fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/movements/entry')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 10 });
      expect(res.status).toBe(400);
    });

    it('returns 201 on happy path', async () => {
      const res = await request(app.getHttpServer())
        .post('/movements/entry')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: 20,
          skuId: sku.id,
          warehouseId: originWarehouse.id,
          employeeId: adminEmployee.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe(MovementType.ENTRANCE);
      expect(res.body.quantity).toBe(20);

      const updatedStock = await stockRepo.findOne({
        where: { id: existingStock.id },
      });
      expect(updatedStock?.quantity).toBe(70); // 50 + 20
      existingStock.quantity = 70; // update local ref
    });
  });

  describe('POST /movements/issue', () => {
    it('returns 201 on happy path', async () => {
      const res = await request(app.getHttpServer())
        .post('/movements/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: 5,
          productVariantId: variant.id,
          warehouseId: originWarehouse.id,
          employeeId: adminEmployee.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].type).toBe(MovementType.ISSUE);

      const updatedStock = await stockRepo.findOne({
        where: { id: existingStock.id },
      });
      expect(updatedStock?.quantity).toBe(65); // 70 - 5
      existingStock.quantity = 65;
    });

    it('returns 400 when insufficient stock', async () => {
      const res = await request(app.getHttpServer())
        .post('/movements/issue')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity: 1000,
          productVariantId: variant.id,
          warehouseId: originWarehouse.id,
          employeeId: adminEmployee.id,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /movements/transfer', () => {
    it('returns 201 on happy path and creates IN_TRANSIT movements', async () => {
      const res = await withSafeTransferGroupId(() =>
        request(app.getHttpServer())
          .post('/movements/transfer')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            quantity: 10,
            productVariantId: variant.id,
            originWarehouseId: originWarehouse.id,
            destinationWarehouseId: destWarehouse.id,
            employeeId: adminEmployee.id,
          }),
      );

      expect(res.status).toBe(201);
      expect(res.body[0].status).toBe(MovementStatus.IN_TRANSIT);
      expect(res.body[0].transferGroupId).toBeDefined();
      pendingTransferGroupId = res.body[0].transferGroupId;

      const updatedStock = await stockRepo.findOne({
        where: { id: existingStock.id },
      });
      expect(updatedStock?.quantity).toBe(55); // 65 - 10
      existingStock.quantity = 55;
    });
  });

  describe('POST /movements/receive-transfer', () => {
    it('returns 201 on ACCEPT happy path', async () => {
      // 1. Create a fresh transfer movement specifically for this test
      const transferRes = await withSafeTransferGroupId(() =>
        request(app.getHttpServer())
          .post('/movements/transfer')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            quantity: 5,
            productVariantId: variant.id,
            originWarehouseId: originWarehouse.id,
            destinationWarehouseId: destWarehouse.id,
            employeeId: adminEmployee.id,
          }),
      );

      const groupId = transferRes.body[0].transferGroupId;
      expect(groupId).toBeDefined();

      // 2. Now receive that specific transfer
      const res = await request(app.getHttpServer())
        .post('/movements/receive-transfer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          transferGroupId: groupId,
          employeeId: adminEmployee.id,
          decision: ReceiveDecision.ACCEPT,
        });

      expect(res.status).toBe(201);
      expect(res.body[0].status).toBe(MovementStatus.COMPLETED);
    });
  });

  describe('POST /movements/issue-from-reservation', () => {
    it('returns 200 on happy path', async () => {
      const res = await request(app.getHttpServer())
        .post('/movements/issue-from-reservation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reservationId: activeReservation.id,
          employeeId: adminEmployee.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe(MovementType.ISSUE);

      const resv = await reservationRepo.findOne({
        where: { id: activeReservation.id },
      });
      expect(resv?.status).toBe('COMPLETED');
    });
  });

  describe('POST /movements/transfer-from-reservation', () => {
    it('returns 200 on happy path', async () => {
      // Create a new reservation for transfer
      const newRes = await reservationRepo.save({
        stock: existingStock,
        quantity: 5,
        status: 'ACTIVE',
        fromDate: new Date(),
        toDate: new Date(Date.now() + 86400000), // +1 day
      });

      const res = await withSafeTransferGroupId(() =>
        request(app.getHttpServer())
          .post('/movements/transfer-from-reservation')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            reservationId: newRes.id,
            destinationWarehouseId: destWarehouse.id,
            employeeId: adminEmployee.id,
          }),
      );

      expect(res.status).toBe(201);
      expect(res.body.type).toBe(MovementType.TRANSFER);
    });
  });

  describe('GET /movements', () => {
    it('returns array of movements with filters applied', async () => {
      const res = await request(app.getHttpServer())
        .get(`/movements?warehouseId=${originWarehouse.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /movements/:id', () => {
    it('returns movement for valid id', async () => {
      // We need a movement in DB to fetch
      const movement = await movementRepo.save({
        quantity: 1,
        type: MovementType.ENTRANCE,
        status: MovementStatus.COMPLETED,
        totalCost: 5,
        date: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get(`/movements/${movement.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(movement.id);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/movements/9999`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
