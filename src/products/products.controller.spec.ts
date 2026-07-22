import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { NotFoundException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Product } from './entities/product.entity';
import request from 'supertest';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;
  let app: INestApplication;

  const mockProduct: Product = {
    id: 1,
    name: 'Vino Tinto',
    unitOfMeasurement: 'Botella',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as any,
    category: null as any,
    provider: null as any,
    variants: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            create: jest.fn().mockReturnValue(mockProduct),
            findAll: jest.fn().mockReturnValue([mockProduct]),
            findOne: jest.fn().mockImplementation((id: number) => {
              if (id === 1) return mockProduct;
              return undefined;
            }),
            update: jest.fn().mockImplementation((id: number, dto: UpdateProductDto) => {
              if (id === 1) return { ...mockProduct, ...dto };
              return undefined;
            }),
            remove: jest.fn().mockImplementation((id: number) => {
              if (id === 1) return true;
              return false;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', () => {
      const createDto: CreateProductDto = { name: 'Vino Tinto', categoryId: 1, providerId: 1, unitOfMeasurement: 'Botella' };
      expect(controller.create(createDto)).toEqual(mockProduct);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of products', () => {
      expect(controller.findAll()).toEqual([mockProduct]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a product by id (happy path)', () => {
      expect(controller.findOne(1)).toEqual(mockProduct);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if product not found (sad path)', () => {
      expect(() => controller.findOne(999)).toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product (happy path)', () => {
      const updateDto: UpdateProductDto = { name: 'Vino Blanco' };
      expect(controller.update(1, updateDto)).toEqual({ ...mockProduct, name: 'Vino Blanco' });
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException if product to update not found (sad path)', () => {
      const updateDto: UpdateProductDto = { name: 'Vino Blanco' };
      expect(() => controller.update(999, updateDto)).toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a product (happy path)', () => {
      expect(controller.remove(1)).toEqual({ success: true });
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if product to remove not found (sad path)', () => {
      expect(() => controller.remove(999)).toThrow(NotFoundException);
    });
  });

  describe('Integration tests with ValidationPipe', () => {
    it('/products (POST) - happy path', () => {
      return request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Vino Tinto',
          categoryId: 1,
          providerId: 1,
          unitOfMeasurement: 'Botella',
        })
        .expect(201)
        .expect({
          ...mockProduct,
          createdAt: mockProduct.createdAt.toISOString(),
          updatedAt: mockProduct.updatedAt.toISOString(),
        });
    });

    it('/products (POST) - sad path, invalid DTO (wrong name format) -> 400', () => {
      return request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Vino Tinto 123',
          categoryId: 1,
          providerId: 1,
          unitOfMeasurement: 'Botella',
        })
        .expect(400);
    });

    it('/products (POST) - sad path, missing required fields -> 400', () => {
      return request(app.getHttpServer())
        .post('/products')
        .send({
          name: 'Vino Tinto',
        })
        .expect(400);
    });

    it('/products/:id (PUT) - sad path, invalid ID format -> 400', () => {
      return request(app.getHttpServer())
        .put('/products/abc')
        .send({
          name: 'Vino Blanco',
        })
        .expect(400);
    });
  });
});
