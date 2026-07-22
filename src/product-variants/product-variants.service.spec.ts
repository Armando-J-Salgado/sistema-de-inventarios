import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariantsService } from './product-variants.service';
import { ProductVariant } from './entities/product-variant.entity';

describe('ProductVariantsService', () => {
  let service: ProductVariantsService;
  let repository: jest.Mocked<Repository<ProductVariant>>;

  const baseVariant: ProductVariant = {
    id: 1,
    name: 'Red Wine glass-bottle xxl',
    description: 'Delicious Red Wine for parties from the year 1978',
    reorderPoint: 10,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as unknown as Date,
    product: undefined as any,
    skus: [],
    alerts: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantsService,
        {
          provide: getRepositoryToken(ProductVariant),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductVariantsService>(ProductVariantsService);
    repository = module.get(getRepositoryToken(ProductVariant));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates and saves a product variant', async () => {
      const dto = { name: 'Test', description: 'desc', reorderPoint: 5, productId: 1 };
      repository.create.mockReturnValue(baseVariant);
      repository.save.mockResolvedValue(baseVariant);

      const result = await service.create(dto as any);

      expect(repository.create).toHaveBeenCalledWith({
        name: 'Test',
        description: 'desc',
        reorderPoint: 5,
        product: { id: 1 },
      });
      expect(repository.save).toHaveBeenCalledWith(baseVariant);
      expect(result).toEqual(baseVariant);
    });
  });

  describe('findAll', () => {
    it('returns only active product variants (soft-deleted excluded)', async () => {
      repository.find.mockResolvedValue([baseVariant]);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({ where: { active: true } });
      expect(result).toEqual([baseVariant]);
    });
  });

  describe('findOne', () => {
    it('returns the product variant when found', async () => {
      repository.findOne.mockResolvedValue(baseVariant);

      const result = await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(baseVariant);
    });

    it('throws NotFoundException when the id does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('does not overwrite fields that are not sent', async () => {
      repository.findOne.mockResolvedValue({ ...baseVariant });
      repository.save.mockImplementation(async (entity) => entity as ProductVariant);

      const result = await service.update(1, { name: 'New name' } as any);

      expect(result.name).toBe('New name');
      expect(result.reorderPoint).toBe(10);
    });

    it('throws NotFoundException when updating a non-existent id', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'x' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft deletes by setting active to false', async () => {
      const variant = { ...baseVariant, active: true };
      repository.findOne.mockResolvedValue(variant);
      repository.save.mockImplementation(async (entity) => entity as ProductVariant);

      const result = await service.remove(1);

      expect(result.active).toBe(false);
    });

    it('throws NotFoundException when removing an already removed/non-existent id', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
