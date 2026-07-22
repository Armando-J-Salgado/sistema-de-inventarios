import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: { getHealthCheck: jest.Mock };

  beforeEach(async () => {
    appService = {
      getHealthCheck: jest.fn().mockReturnValue('ok'),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the health check payload', () => {
      expect(appController.getHealthCheck()).toBe('ok');
      expect(appService.getHealthCheck).toHaveBeenCalledTimes(1);
    });
  });
});
