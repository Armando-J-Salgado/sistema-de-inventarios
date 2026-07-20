import { Test, TestingModule } from '@nestjs/testing';
import { SkusController } from './skus.controller';
import { SkusService } from './skus.service';

describe('SkusController', () => {
  let controller: SkusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkusController],
      providers: [SkusService],
    }).compile();

    controller = module.get<SkusController>(SkusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
