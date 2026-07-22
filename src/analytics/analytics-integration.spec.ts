import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AnalyticsModule } from './analytics.module';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Warehouse } from '../warehouses/entities/warehouse.entity';

describe('AnalyticsModule (Integration)', () => {
  let app: INestApplication<App>;
  let mockWarehouseRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 5, administrator: { id: 10 } })
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
    .overrideProvider(getRepositoryToken(Warehouse))
    .useValue(mockWarehouseRepo)
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
