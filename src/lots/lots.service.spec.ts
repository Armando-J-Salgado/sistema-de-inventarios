import { Test, TestingModule } from '@nestjs/testing';
import { LotsService } from './lots.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Lot } from './entities/lot.entity';
import { Provider } from 'src/providers/entities/provider.entity';
import { Sku } from 'src/skus/entities/skus.entity';
import { LotState } from './enums/lot-state.enum';

describe('LotsService', () => {
  let service: LotsService;
  const lotRepository = {
    create: jest.fn((value) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
  };
  const providerRepository = {
    findOne: jest.fn(),
  };
  const skuRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LotsService,
        { provide: getRepositoryToken(Lot), useValue: lotRepository },
        { provide: getRepositoryToken(Provider), useValue: providerRepository },
        { provide: getRepositoryToken(Sku), useValue: skuRepository },
      ],
    }).compile();

    service = module.get<LotsService>(LotsService);
    jest.clearAllMocks();
  });

  it('creates a lot when the provider exists', async () => {
    providerRepository.findOne.mockResolvedValue({ id: 1 } as Provider);

    const result = await service.create({
      providerId: 1,
      dateOfEntry: new Date('2026-07-22T10:00:00.000Z'),
    } as any);

    expect(providerRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result.state).toBe(LotState.RECEIVED);
    expect(result.providerId).toBe(1);
  });

  it('throws when the provider does not exist', async () => {
    providerRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ providerId: 99, dateOfEntry: new Date('2026-07-22T10:00:00.000Z') } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll applies filters and defaults active to true', async () => {
    lotRepository.find.mockResolvedValue([]);

    await service.findAll({ providerId: 2, state: LotState.PENDING } as any);

    expect(lotRepository.find).toHaveBeenCalledWith({
      where: { active: true, providerId: 2, state: LotState.PENDING },
      relations: ['provider'],
    });
  });

  it('returns the lot with provider and skus', async () => {
    lotRepository.findOne.mockResolvedValue({ id: 1, skus: [] });

    await expect(service.findOne(1)).resolves.toEqual({ id: 1, skus: [] });
    expect(lotRepository.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['provider', 'skus'],
    });
  });

  it('throws when the lot is missing', async () => {
    lotRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates the lot and changes provider when needed', async () => {
    lotRepository.findOne.mockResolvedValueOnce({ id: 1, providerId: 1, skus: [], state: LotState.RECEIVED });
    providerRepository.findOne.mockResolvedValueOnce({ id: 2 } as Provider);

    const result = await service.update(1, { providerId: 2, state: LotState.CLOSED } as any);

    expect(providerRepository.findOne).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(result.providerId).toBe(2);
    expect(result.state).toBe(LotState.CLOSED);
  });

  it('prevents deactivating a lot with skus', async () => {
    lotRepository.findOne.mockResolvedValue({ id: 1, providerId: 1, skus: [{ id: 'sku-1' }] });

    await expect(service.remove(1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('deactivates a lot without skus', async () => {
    lotRepository.findOne.mockResolvedValue({ id: 1, providerId: 1, skus: [], active: true });

    const result = await service.remove(1);

    expect(result.active).toBe(false);
    expect(lotRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, active: false }));
  });
});
