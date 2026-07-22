import { Test, TestingModule } from '@nestjs/testing';
import { ProductVariantsController } from './product-variants.controller';
import { ProductVariantsService } from './product-variants.service';

describe('ProductVariantsController', () => {
  let controller: ProductVariantsController;
  let service: jest.Mocked<ProductVariantsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductVariantsController],
      providers: [
        {
          provide: ProductVariantsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductVariantsController>(ProductVariantsController);
    service = module.get(ProductVariantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to the service', () => {
    const dto = { name: 'Test', description: 'desc', reorderPoint: 0, productId: 1 };
    controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll delegates to the service', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne parses the id and delegates to the service', () => {
    controller.findOne('5');
    expect(service.findOne).toHaveBeenCalledWith(5);
  });

  it('update parses the id and delegates to the service', () => {
    const dto = { name: 'New name' };
    controller.update('5', dto as any);
    expect(service.update).toHaveBeenCalledWith(5, dto);
  });

  it('remove parses the id and delegates to the service', () => {
    controller.remove('5');
    expect(service.remove).toHaveBeenCalledWith(5);
  });
});
