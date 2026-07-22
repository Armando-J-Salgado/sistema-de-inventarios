import { Test, TestingModule } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

describe('AlertsController', () => {
  let controller: AlertsController;
  let service: jest.Mocked<AlertsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: AlertsService,
          useValue: { findAll: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AlertsController>(AlertsController);
    service = module.get(AlertsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('is read-only: no create/update/remove handlers', () => {
    expect((controller as any).create).toBeUndefined();
    expect((controller as any).update).toBeUndefined();
    expect((controller as any).remove).toBeUndefined();
  });

  it('findAll delegates to the service', () => {
    controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne parses the id and delegates to the service', () => {
    controller.findOne('4');
    expect(service.findOne).toHaveBeenCalledWith(4);
  });
});
