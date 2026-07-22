import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException, NotImplementedException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AnalyticsModule } from './analytics.module';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Product } from '../products/entities/product.entity';
import { Sku } from '../skus/entities/skus.entity';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { Stock } from '../stocks/entities/stock.entity';
import { Movement } from '../movements/entities/movement.entity';
import { GlobalAnalyticsRepository } from './repositories/global-analytics.repository';
import { WarehouseAnalyticsRepository } from './repositories/warehouse-analytics.repository';

describe('AnalyticsModule (Integration)', () => {
  let app: INestApplication<App>;
  let mockWarehouseRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 5, administrator: { id: 10 } })
  };

  const mockGlobalRepo = {
    getRotationData: jest.fn().mockImplementation(async (id) => {
      if(id === 999) throw new NotFoundException();
      return { productId: id, rotationRate: 5.5, movements: 120, type: 'global' };
    }),
    getTopMovingData: jest.fn().mockImplementation(async (limit) => {
      return Array.from({length: limit}, (_, i) => ({ productId: i+1, name: 'P', movementCount: 100, type: 'global' }));
    }),
    getCoverageData: jest.fn().mockImplementation(async (id) => {
      if(id === 'SKU-INVALID') throw new NotFoundException();
      return { skuId: id, stockQuantity: 1000, avgDailyConsumption: 50, type: 'global' };
    }),
    getNeedReorderData: jest.fn().mockResolvedValue([
      { productVariantId: 1, name: 'V', currentStock: 5, reorderPoint: 10, type: 'global' }
    ])
  };

  const mockWarehouseRepoService = {
    setWarehouseId: jest.fn(),
    getRotationData: jest.fn().mockImplementation(async (id) => {
      if(id === 999) throw new NotFoundException();
      return { productId: id, rotationRate: 3.2, movements: 45, type: 'warehouse', warehouseId: 5 };
    }),
    getTopMovingData: jest.fn().mockImplementation(async (limit) => {
      return Array.from({length: limit}, (_, i) => ({ productId: i+1, name: 'P', movementCount: 100, type: 'warehouse', warehouseId: 5 }));
    }),
    getCoverageData: jest.fn().mockImplementation(async (id) => {
      if(id === 'SKU-INVALID') throw new NotFoundException();
      return { skuId: id, stockQuantity: 200, avgDailyConsumption: 10, type: 'warehouse', warehouseId: 5 };
    }),
    getNeedReorderData: jest.fn().mockRejectedValue(new NotImplementedException()),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AnalyticsModule],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        const authHeader = req.headers['authorization'];
        if (authHeader === 'Bearer MANAGER') {
          req.user = { employeeId: 10, roles: 'WAREHOUSE_MANAGER' };
        } else if (!req.user) {
          req.user = { employeeId: 10, roles: 'ADMINISTRATOR' };
        }
        return true; 
    } })
    .overrideProvider(getRepositoryToken(Warehouse)).useValue(mockWarehouseRepo)
    .overrideProvider(getRepositoryToken(Product)).useValue({})
    .overrideProvider(getRepositoryToken(Sku)).useValue({})
    .overrideProvider(getRepositoryToken(ProductVariant)).useValue({})
    .overrideProvider(getRepositoryToken(Stock)).useValue({})
    .overrideProvider(getRepositoryToken(Movement)).useValue({})
    .overrideProvider(GlobalAnalyticsRepository).useValue(mockGlobalRepo)
    .overrideProvider(WarehouseAnalyticsRepository).useValue(mockWarehouseRepoService)
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  describe('Global Analytics', () => {
    it('/analytics/rotation/:productId (GET) - happy path', () => {
      return request(app.getHttpServer())
        .get('/analytics/rotation/10')
        .expect(200)
        .expect((res) => {
          expect(res.body.productId).toBe(10);
          expect(res.body.type).toBe('global');
        });
    });

    it('/analytics/rotation/:productId (GET) - sad path (invalid numeric param format)', () => {
      return request(app.getHttpServer())
        .get('/analytics/rotation/abc')
        .expect(400); // ParseIntPipe validation fails
    });

    it('/analytics/rotation/:productId (GET) - sad path (product not found 404)', () => {
      return request(app.getHttpServer())
        .get('/analytics/rotation/999')
        .expect(404);
    });

    it('/analytics/top-moving (GET) - happy path (default limit 5)', () => {
      return request(app.getHttpServer())
        .get('/analytics/top-moving')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(5);
        });
    });

    it('/analytics/top-moving (GET) - happy path (custom limit 2)', () => {
      return request(app.getHttpServer())
        .get('/analytics/top-moving?limit=2')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
        });
    });

    it('/analytics/coverage/:skuId (GET) - happy path', () => {
      return request(app.getHttpServer())
        .get('/analytics/coverage/SKU-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.skuId).toBe('SKU-123');
        });
    });

    it('/analytics/coverage/:skuId (GET) - sad path (SKU not found 404)', () => {
      return request(app.getHttpServer())
        .get('/analytics/coverage/SKU-INVALID')
        .expect(404);
    });

    it('/analytics/need-reorder (GET) - happy path (ADMINISTRATOR)', () => {
      return request(app.getHttpServer())
        .get('/analytics/need-reorder')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body[0].needsReorder).toBe(true);
        });
    });

    it('/analytics/need-reorder (GET) - sad path (WAREHOUSE_MANAGER 403)', () => {
      return request(app.getHttpServer())
        .get('/analytics/need-reorder')
        .set('Authorization', 'Bearer MANAGER')
        .expect(403);
    });
  });

  describe('Warehouse Analytics', () => {
    it('/warehouses/:warehouseId/analytics/rotation/:productId (GET) - happy path', () => {
      return request(app.getHttpServer())
        .get('/warehouses/5/analytics/rotation/10')
        .expect(200)
        .expect((res) => {
          expect(res.body.productId).toBe(10);
          expect(res.body.warehouseId).toBe(5);
          expect(res.body.type).toBe('warehouse');
        });
    });

    it('/warehouses/:warehouseId/analytics/rotation/:productId (GET) - sad path (invalid warehouseId param format)', () => {
      return request(app.getHttpServer())
        .get('/warehouses/invalid/analytics/rotation/10')
        .expect(400);
    });

    it('/warehouses/:warehouseId/analytics/rotation/:productId (GET) - sad path (product not found in warehouse 404)', () => {
      return request(app.getHttpServer())
        .get('/warehouses/5/analytics/rotation/999')
        .expect(404);
    });

    it('/warehouses/:warehouseId/analytics/top-moving (GET) - happy path', () => {
      return request(app.getHttpServer())
        .get('/warehouses/5/analytics/top-moving')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body[0].warehouseId).toBe(5);
        });
    });

    it('/warehouses/:warehouseId/analytics/coverage/:skuId (GET) - happy path', () => {
      return request(app.getHttpServer())
        .get('/warehouses/5/analytics/coverage/SKU-123')
        .expect(200)
        .expect((res) => {
          expect(res.body.skuId).toBe('SKU-123');
          expect(res.body.warehouseId).toBe(5);
        });
    });
  });

  afterEach(async () => {
    await app.close();
  });
});
