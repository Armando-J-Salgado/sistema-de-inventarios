import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { App } from 'supertest/types';
import { EmployeesModule } from '../src/employees/employees.module';
import { JwtStrategy } from '../src/jwt/jwt.strategy';
import { Employee } from '../src/employees/entities/employee.entity';
import { Warehouse } from '../src/warehouses/entities/warehouse.entity';
import { Category } from '../src/categories/entities/category.entity';
import { Provider } from '../src/providers/entities/provider.entity';
import { Product } from '../src/products/entities/product.entity';
import { ProductVariant } from '../src/product-variants/entities/product-variant.entity';
import { Lot } from '../src/lots/entities/lot.entity';
import { Sku } from '../src/skus/entities/skus.entity';
import { Alert } from '../src/alerts/entities/alert.entity';
import { Stock } from '../src/stocks/entities/stock.entity';
import { Reservation } from '../src/reservations/entities/reservation.entity';
import { Movement } from '../src/movements/entities/movement.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

dotenv.config({ path: path.resolve(__dirname, '../.env.testing') });

jest.setTimeout(30000);

describe('EmployeesModule (e2e)', () => {
  let app: INestApplication<App>;
  let employeeRepo: Repository<Employee>;
  let warehouseRepo: Repository<Warehouse>;
  let jwtService: JwtService;

  let adminToken: string;
  let employeeToken: string;
  let adminEmployee: Employee;
  let standardEmployee: Employee;
  let employeeWithWarehouse: Employee;

  const secret = process.env.SECRET_KEY ?? '';

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
          secret,
          signOptions: { expiresIn: '1h' },
        }),
        EmployeesModule,
        TypeOrmModule.forFeature([Category, Provider, Product, ProductVariant, Lot, Employee, Sku, Alert, Stock, Reservation, Movement, Warehouse]),
      ],
      providers: [JwtStrategy],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    employeeRepo = moduleFixture.get<Repository<Employee>>(getRepositoryToken(Employee));
    warehouseRepo = moduleFixture.get<Repository<Warehouse>>(getRepositoryToken(Warehouse));
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await employeeRepo.delete({ email: 'admin@test.com' });
    await employeeRepo.delete({ email: 'employee@test.com' });
    await employeeRepo.delete({ email: 'warehouse@test.com' });
    await employeeRepo.delete({ email: 'inactive@test.com' });
    await employeeRepo.delete({ email: 'new.employee@test.com' });
    await warehouseRepo.delete({ name: 'Employee Active Warehouse' });

    const hashedPassword = await bcrypt.hash('ValidPass1!', 10);

    adminEmployee = await employeeRepo.save({
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Test Admin',
      address: '123 Main St',
      role: 'ADMINISTRATOR',
      active: true,
    });

    standardEmployee = await employeeRepo.save({
      email: 'employee@test.com',
      password: hashedPassword,
      name: 'Test Employee',
      address: '456 Side St',
      role: 'WAREHOUSE_MANAGER',
      active: true,
    });

    const warehouse = await warehouseRepo.save({
      name: 'Employee Active Warehouse',
      maximumCapacity: 100,
      availableCapacity: 100,
      active: true,
    });

    employeeWithWarehouse = await employeeRepo.save({
      email: 'warehouse@test.com',
      password: hashedPassword,
      name: 'Warehouse Employee',
      address: '789 Warehouse St',
      role: 'WAREHOUSE_MANAGER',
      active: true,
      warehouse,
    });

    await employeeRepo.save({
      email: 'inactive@test.com',
      password: hashedPassword,
      name: 'Inactive Employee',
      address: '999 Old St',
      role: 'ADMINISTRATOR',
      active: false,
    });

    adminToken = jwtService.sign({ sub: adminEmployee.id, email: adminEmployee.email, roles: adminEmployee.role });
    employeeToken = jwtService.sign({ sub: standardEmployee.id, email: standardEmployee.email, roles: standardEmployee.role });
  });

  afterAll(async () => {
    if (employeeRepo) {
      await employeeRepo.delete({ email: 'admin@test.com' });
      await employeeRepo.delete({ email: 'employee@test.com' });
      await employeeRepo.delete({ email: 'warehouse@test.com' });
      await employeeRepo.delete({ email: 'inactive@test.com' });
      await employeeRepo.delete({ email: 'new.employee@test.com' });
    }

    if (warehouseRepo) {
      await warehouseRepo.delete({ name: 'Employee Active Warehouse' });
    }

    if (app) {
      await app.close();
    }
  });

  describe('POST /employees', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/employees')
        .send({
          email: 'new.employee@test.com',
          password: 'Password123',
          name: 'Juan Pérez',
          address: 'Calle 1',
          role: 'ADMINISTRATOR',
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 when token does not have administrator role', async () => {
      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          email: 'new.employee@test.com',
          password: 'Password123',
          name: 'Juan Pérez',
          address: 'Calle 1',
          role: 'ADMINISTRATOR',
        });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid employee data', async () => {
      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: '123',
          name: 'Juan_Perez#123',
          address: 'Calle 1',
          role: 'ADMINISTRATOR',
        });

      expect(response.status).toBe(400);
    });

    it('should create a valid employee', async () => {
      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new.employee@test.com',
          password: 'Password123',
          name: 'Juan Carlos Pérez',
          address: 'Calle 1',
          role: 'ADMINISTRATOR',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('new.employee@test.com');
      expect(response.body.password).toBeUndefined();
      expect(response.body.active).toBe(true);
    });

    it('should return 409 when email already exists', async () => {
      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'new.employee@test.com',
          password: 'Password123',
          name: 'Juan Carlos Pérez',
          address: 'Calle 1',
          role: 'ADMINISTRATOR',
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('El correo electrónico ya está registrado');
    });
  });

  describe('GET /employees', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer()).get('/employees');

      expect(response.status).toBe(401);
    });

    it('should return all employees for any authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(4);
    });

    it('should filter only active employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees?active=true')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.every((employee: any) => employee.active === true)).toBe(true);
    });
  });

  describe('GET /employees/:id', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer()).get(`/employees/${standardEmployee.id}`);

      expect(response.status).toBe(401);
    });

    it('should return the employee when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/employees/${standardEmployee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(standardEmployee.id);
      expect(response.body.email).toBe('employee@test.com');
    });
  });

  describe('PATCH /employees/:id', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/employees/${standardEmployee.id}`)
        .send({ name: 'Nuevo Nombre' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/employees/${standardEmployee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Nuevo Nombre' });

      expect(response.status).toBe(403);
    });

    it('should update employee data for administrator token', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/employees/${standardEmployee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Nombre Actualizado' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Nombre Actualizado');
    });
  });

  describe('DELETE /employees/:id', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer()).delete(`/employees/${standardEmployee.id}`);

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-admin token', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/employees/${standardEmployee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 409 when the employee has an active warehouse assigned', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/employees/${employeeWithWarehouse.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('El empleado tiene una bodega activa asignada');
    });

    it('should deactivate the employee when no active warehouse is assigned', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/employees/${standardEmployee.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.active).toBe(false);
    });
  });
});