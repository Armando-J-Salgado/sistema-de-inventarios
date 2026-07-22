import { Test, TestingModule } from '@nestjs/testing';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';
import { LotState } from './enums/lot-state.enum';

describe('LotsController', () => {
  let controller: LotsController;
  const lotsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LotsController],
      providers: [{ provide: LotsService, useValue: lotsService }],
    }).compile();

    controller = module.get<LotsController>(LotsController);
    jest.clearAllMocks();
  });

  it('delegates create to the service', () => {
    const payload = {
      providerId: 1,
      dateOfEntry: new Date('2026-07-22T10:00:00.000Z'),
      state: LotState.RECEIVED,
    };

    lotsService.create.mockReturnValue(payload);

    expect(controller.create(payload as any)).toBe(payload);
    expect(lotsService.create).toHaveBeenCalledWith(payload);
  });

  it('delegates findAll to the service', () => {
    lotsService.findAll.mockReturnValue([]);

    expect(controller.findAll({ providerId: 2, state: LotState.PENDING, active: true } as any)).toEqual([]);
    expect(lotsService.findAll).toHaveBeenCalledWith({ providerId: 2, state: LotState.PENDING, active: true });
  });

  it('delegates findOne to the service', () => {
    lotsService.findOne.mockReturnValue({ id: 1 });

    expect(controller.findOne(1)).toEqual({ id: 1 });
    expect(lotsService.findOne).toHaveBeenCalledWith(1);
  });

  it('delegates update to the service', () => {
    lotsService.update.mockReturnValue({ id: 1, state: LotState.CLOSED });

    expect(controller.update(1, { state: LotState.CLOSED } as any)).toEqual({ id: 1, state: LotState.CLOSED });
    expect(lotsService.update).toHaveBeenCalledWith(1, { state: LotState.CLOSED });
  });

  it('delegates remove to the service', () => {
    lotsService.remove.mockReturnValue({ id: 1, active: false });

    expect(controller.remove(1)).toEqual({ id: 1, active: false });
    expect(lotsService.remove).toHaveBeenCalledWith(1);
  });
});
