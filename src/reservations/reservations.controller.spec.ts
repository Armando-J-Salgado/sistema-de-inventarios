import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationStatus } from './enums/reservation-status.enum';

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let service: any;

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        {
          provide: ReservationsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto = { sourceStockId: 1, quantity: 10, fromDate: '2026-07-25T10:00:00Z', toDate: '2026-07-26T10:00:00Z' };
      service.create.mockResolvedValue({ id: 1, ...dto, status: ReservationStatus.ACTIVE });
      const result = await controller.create(dto, { user: {} });
      expect(service.create).toHaveBeenCalledWith(dto, {});
      expect(result.id).toBe(1);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      service.findAll.mockResolvedValue([]);
      await controller.findAll({ user: {} });
      expect(service.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      service.findOne.mockResolvedValue({ id: 1 });
      await controller.findOne('1', { user: {} });
      expect(service.findOne).toHaveBeenCalledWith(1, {});
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto = { status: ReservationStatus.COMPLETED };
      service.update.mockResolvedValue({ id: 1, ...dto });
      await controller.update('1', dto, { user: {} });
      expect(service.update).toHaveBeenCalledWith(1, dto, {});
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      service.remove.mockResolvedValue({ id: 1, status: ReservationStatus.CANCELLED });
      await controller.remove('1', { user: {} });
      expect(service.remove).toHaveBeenCalledWith(1, {});
    });
  });
});

