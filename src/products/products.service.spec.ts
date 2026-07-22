import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new product', () => {
      const createDto: CreateProductDto = { name: 'Manzana', categoryId: 1, providerId: 1, unitOfMeasurement: 'Kg' };
      const result = service.create(createDto);
      expect(result).toMatchObject({
        name: createDto.name,
        unitOfMeasurement: createDto.unitOfMeasurement,
        active: true,
      });
      expect(result.id).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return an array of products', () => {
      const result = service.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a product by id (happy path)', () => {
      const createDto: CreateProductDto = { name: 'Manzana', categoryId: 1, providerId: 1, unitOfMeasurement: 'Kg' };
      const created = service.create(createDto);
      const result = service.findOne(created.id);
      expect(result).toBeDefined();
      expect(result?.id).toEqual(created.id);
    });

    it('should return undefined if product not found (sad path)', () => {
      const result = service.findOne(999);
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update a product (happy path)', () => {
      const createDto: CreateProductDto = { name: 'Manzana', categoryId: 1, providerId: 1, unitOfMeasurement: 'Kg' };
      const created = service.create(createDto);
      const updateDto: UpdateProductDto = { name: 'Pera' };
      const result = service.update(created.id, updateDto);
      expect(result).toBeDefined();
      expect(result?.name).toEqual('Pera');
    });

    it('should return undefined if product to update not found (sad path)', () => {
      const updateDto: UpdateProductDto = { name: 'Pera' };
      const result = service.update(999, updateDto);
      expect(result).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should remove a product (happy path)', () => {
      const createDto: CreateProductDto = { name: 'Manzana', categoryId: 1, providerId: 1, unitOfMeasurement: 'Kg' };
      const created = service.create(createDto);
      const result = service.remove(created.id);
      expect(result).toBe(true);
      const find = service.findOne(created.id);
      expect(find).toBeUndefined();
    });

    it('should return false if product to remove not found (sad path)', () => {
      const result = service.remove(999);
      expect(result).toBe(false);
    });
  });
});
