import { Test, TestingModule } from '@nestjs/testing';
import { StocksController } from './stocks.controller';
import { StocksService } from './stocks.service';

describe('StocksController', () => {
  let controller: StocksController;
  let service: jest.Mocked<StocksService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StocksController],
      providers: [
        {
          provide: StocksService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            getAvailable: jest.fn(),
            getAvailableByVariantWarehouse: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StocksController>(StocksController);
    service = module.get(StocksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('has no create/POST handler', () => {
    expect((controller as any).create).toBeUndefined();
  });

  it('findAll delegates to the service', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne parses the id and delegates to the service', () => {
    controller.findOne('7');
    expect(service.findOne).toHaveBeenCalledWith(7);
  });

  it('getAvailable parses the id and delegates to the service', () => {
    controller.getAvailable('7');
    expect(service.getAvailable).toHaveBeenCalledWith(7);
  });

  it('getAvailableByVariantWarehouse forwards variantId and warehouseId', () => {
    controller.getAvailableByVariantWarehouse({ variantId: 3, warehouseId: 2 });
    expect(service.getAvailableByVariantWarehouse).toHaveBeenCalledWith(3, 2);
  });

  it('getAvailableByVariantWarehouse forwards undefined warehouseId when omitted', () => {
    controller.getAvailableByVariantWarehouse({ variantId: 3 } as any);
    expect(service.getAvailableByVariantWarehouse).toHaveBeenCalledWith(3, undefined);
  });

  it('update parses the id and delegates to the service', () => {
    controller.update('7', { quantity: 10 } as any);
    expect(service.update).toHaveBeenCalledWith(7, { quantity: 10 });
  });

  it('remove parses the id and delegates to the service', () => {
    controller.remove('7');
    expect(service.remove).toHaveBeenCalledWith(7);
  });
});
