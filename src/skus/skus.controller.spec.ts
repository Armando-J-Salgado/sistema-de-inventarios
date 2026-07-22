import { Test, TestingModule } from '@nestjs/testing';
import { SkusController } from './skus.controller';
import { SkusService } from './skus.service';

describe('SkusController', () => {
  let controller: SkusController;
  const skusServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkusController],
      providers: [{ provide: SkusService, useValue: skusServiceMock }],
    }).compile();

    controller = module.get<SkusController>(SkusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates patch updates to the service using the string id', async () => {
    skusServiceMock.update.mockResolvedValue({ id: 'SKU-1' });

    const response = await controller.update('SKU-1', { quantity: 12 });

    expect(skusServiceMock.update).toHaveBeenCalledWith('SKU-1', { quantity: 12 });
    expect(response).toEqual({ id: 'SKU-1' });
  });
});
