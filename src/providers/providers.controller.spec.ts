import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { CreateProviderDto } from './dto/create-provider.dto';

describe('ProvidersController', () => {
  let app: INestApplication;
  let service: ProvidersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [ProvidersService],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    service = module.get<ProvidersService>(ProvidersService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    const controller = app.get<ProvidersController>(ProvidersController);
    expect(controller).toBeDefined();
  });

  describe('POST /providers', () => {
    it('should create a provider (happy path)', () => {
      const createDto: CreateProviderDto = {
        name: 'Valid Name',
        address: 'Valid Address',
        email: 'valid@email.com',
      };

      return request(app.getHttpServer())
        .post('/providers')
        .send(createDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toEqual(createDto.name);
        });
    });

    it('should return 400 on invalid DTO (sad path)', () => {
      const invalidDto = {
        name: 'Invalid_Name_123', // Regex will fail
        email: 'not-an-email',
      };

      return request(app.getHttpServer())
        .post('/providers')
        .send(invalidDto)
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toEqual(expect.arrayContaining([
            'name must contain only letters, spaces and accents',
            'email must be an email',
            'address should not be empty',
            'address must be a string'
          ]));
        });
    });
  });

  describe('GET /providers', () => {
    it('should return array of providers (happy path)', () => {
      return request(app.getHttpServer())
        .get('/providers')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /providers/:id', () => {
    it('should return a provider (happy path)', () => {
      return request(app.getHttpServer())
        .get('/providers/1')
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toEqual(1);
        });
    });

    it('should return 404 if provider not found (sad path)', () => {
      return request(app.getHttpServer())
        .get('/providers/999')
        .expect(404);
    });
  });

  describe('PUT /providers/:id', () => {
    it('should update a provider (happy path)', () => {
      return request(app.getHttpServer())
        .put('/providers/1')
        .send({ name: 'Updated Provider Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toEqual('Updated Provider Name');
        });
    });

    it('should return 404 if provider to update not found (sad path)', () => {
      return request(app.getHttpServer())
        .put('/providers/999')
        .send({ name: 'Valid' })
        .expect(404);
    });
  });

  describe('DELETE /providers/:id', () => {
    it('should remove a provider (happy path)', async () => {
      // Create one to delete just to be safe it exists
      const postRes = await request(app.getHttpServer())
        .post('/providers')
        .send({ name: 'To Delete', address: 'Addr', email: 'del@test.com' });
      
      const newId = postRes.body.id;

      await request(app.getHttpServer())
        .delete(`/providers/${newId}`)
        .expect(200);

      // Verify it's deleted
      return request(app.getHttpServer())
        .get(`/providers/${newId}`)
        .expect(404);
    });

    it('should return 404 if provider to remove not found (sad path)', () => {
      return request(app.getHttpServer())
        .delete('/providers/999')
        .expect(404);
    });
  });
});
