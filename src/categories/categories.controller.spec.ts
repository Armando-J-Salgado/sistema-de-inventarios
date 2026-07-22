import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;

  const mockCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate create category dto to service', async () => {
      const dto: CreateCategoryDto = { name: 'Red Wines' };
      const expectedResult = { id: 1, name: 'Red Wines', active: true };
      mockCategoriesService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should pass undefined to service when no query param is provided', async () => {
      mockCategoriesService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined as any);

      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass true to service when active query is "true"', async () => {
      mockCategoriesService.findAll.mockResolvedValue([]);

      await controller.findAll('true');

      expect(service.findAll).toHaveBeenCalledWith(true);
    });

    it('should pass false to service when active query is "false"', async () => {
      mockCategoriesService.findAll.mockResolvedValue([]);

      await controller.findAll('false');

      expect(service.findAll).toHaveBeenCalledWith(false);
    });

    it('should pass undefined to service for unrecognised active query value', async () => {
      mockCategoriesService.findAll.mockResolvedValue([]);

      await controller.findAll('invalid');

      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findOne', () => {
    it('should convert id param to number and delegate to service findOne', async () => {
      const category = { id: 1, name: 'Red Wines' };
      mockCategoriesService.findOne.mockResolvedValue(category);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(category);
    });
  });

  describe('update', () => {
    it('should convert id param to number and delegate update to service', async () => {
      const dto: UpdateCategoryDto = { name: 'Sparkling Wines' };
      const updatedCategory = { id: 1, name: 'Sparkling Wines', active: true };
      mockCategoriesService.update.mockResolvedValue(updatedCategory);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updatedCategory);
    });
  });

  describe('remove', () => {
    it('should convert id param to number and delegate remove to service', async () => {
      const removedCategory = { id: 1, name: 'Red Wines', active: false };
      mockCategoriesService.remove.mockResolvedValue(removedCategory);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(removedCategory);
    });
  });
});
