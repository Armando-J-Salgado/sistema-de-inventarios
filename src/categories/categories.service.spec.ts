import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a category when name is unique', async () => {
      const dto = { name: 'Red Wines' };
      const createdCategory = { id: 1, name: 'Red Wines', active: true };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(createdCategory);
      mockRepository.save.mockResolvedValue(createdCategory);

      const result = await service.create(dto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { name: 'Red Wines' } });
      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(createdCategory);
      expect(result).toEqual(createdCategory);
    });

    it('should throw ConflictException when category name already exists', async () => {
      const dto = { name: 'Red Wines' };
      mockRepository.findOne.mockResolvedValue({ id: 1, name: 'Red Wines' });

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Category name already exists'),
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all categories when active parameter is undefined', async () => {
      const categories = [{ id: 1, name: 'Red Wines' }, { id: 2, name: 'White Wines' }];
      mockRepository.find.mockResolvedValue(categories);

      const result = await service.findAll(undefined);

      expect(mockRepository.find).toHaveBeenCalledWith({});
      expect(result).toEqual(categories);
    });

    it('should return only active categories when active parameter is true', async () => {
      const activeCategories = [{ id: 1, name: 'Red Wines', active: true }];
      mockRepository.find.mockResolvedValue(activeCategories);

      const result = await service.findAll(true);

      expect(mockRepository.find).toHaveBeenCalledWith({ where: { active: true } });
      expect(result).toEqual(activeCategories);
    });

    it('should return only inactive categories when active parameter is false', async () => {
      const inactiveCategories = [{ id: 2, name: 'White Wines', active: false }];
      mockRepository.find.mockResolvedValue(inactiveCategories);

      const result = await service.findAll(false);

      expect(mockRepository.find).toHaveBeenCalledWith({ where: { active: false } });
      expect(result).toEqual(inactiveCategories);
    });
  });

  describe('findOne', () => {
    it('should return category when found', async () => {
      const category = { id: 1, name: 'Red Wines' };
      mockRepository.findOne.mockResolvedValue(category);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(category);
    });

    it('should throw NotFoundException when category is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('The category with id #999 could not be found'),
      );
    });
  });

  describe('update', () => {
    it('should update and return category when ID exists and name is unique', async () => {
      const existingCategory = { id: 1, name: 'Red Wines', active: true };
      const dto = { name: 'Sparkling Wines' };

      mockRepository.findOne
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue({ id: 1, name: 'Sparkling Wines', active: true });

      const result = await service.update(1, dto);

      expect(mockRepository.save).toHaveBeenCalledWith({ id: 1, name: 'Sparkling Wines', active: true });
      expect(result).toEqual({ id: 1, name: 'Sparkling Wines', active: true });
    });

    it('should throw NotFoundException when category to update does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New Name' })).rejects.toThrow(
        new NotFoundException('The category with id #999 was not found'),
      );
    });

    it('should throw ConflictException when updated name conflicts with existing category', async () => {
      const existingCategory = { id: 1, name: 'Red Wines', active: true };
      const conflictCategory = { id: 2, name: 'White Wines', active: true };

      mockRepository.findOne
        .mockResolvedValueOnce(existingCategory)
        .mockResolvedValueOnce(conflictCategory);

      await expect(service.update(1, { name: 'White Wines' })).rejects.toThrow(
        new ConflictException('Category name already exists'),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete category by setting active to false', async () => {
      const existingCategory = { id: 1, name: 'Red Wines', active: true };
      mockRepository.findOne.mockResolvedValue(existingCategory);
      mockRepository.save.mockImplementation(async (cat) => cat);

      const result = await service.remove(1);

      expect(mockRepository.save).toHaveBeenCalledWith({ id: 1, name: 'Red Wines', active: false });
      expect(result.active).toBe(false);
    });

    it('should throw NotFoundException when category to remove is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('The searched category with id #999 was not found'),
      );
    });
  });
});
