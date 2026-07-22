import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkusService } from './skus.service';
import { Sku } from './entities/skus.entity';
import { Lot } from 'src/lots/entities/lot.entity';
import { ProductVariant } from 'src/product-variants/entities/product-variant.entity';
import { Stock } from 'src/stocks/entities/stock.entity';

const createRepositoryMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('SkusService', () => {
  let service: SkusService;
  let skuRepository: ReturnType<typeof createRepositoryMock>;
  let lotRepository: ReturnType<typeof createRepositoryMock>;
  let productVariantRepository: ReturnType<typeof createRepositoryMock>;
  let stockRepository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    skuRepository = createRepositoryMock();
    lotRepository = createRepositoryMock();
    productVariantRepository = createRepositoryMock();
    stockRepository = createRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkusService,
        { provide: getRepositoryToken(Sku), useValue: skuRepository },
        { provide: getRepositoryToken(Lot), useValue: lotRepository },
        { provide: getRepositoryToken(ProductVariant), useValue: productVariantRepository },
        { provide: getRepositoryToken(Stock), useValue: stockRepository },
      ],
    }).compile();

    service = module.get<SkusService>(SkusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an sku after validating lot and product variant', async () => {
    lotRepository.findOne.mockResolvedValue({ id: 1 });
    productVariantRepository.findOne.mockResolvedValue({ id: 2 });
    skuRepository.findOne.mockResolvedValue(null);

    const createdSku = { id: 'SKU-1', active: true } as Sku;
    skuRepository.create.mockReturnValue(createdSku);
    skuRepository.save.mockResolvedValue(createdSku);

    const result = await service.create({
      id: 'SKU-1',
      lotId: 1,
      productVariantId: 2,
      dateOfEntry: '2026-07-22T00:00:00.000Z',
      quantity: 10,
      unitCost: 12.5,
      bestBeforeDate: '2026-08-22T00:00:00.000Z',
    });

    expect(result).toBe(createdSku);
    expect(skuRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      id: 'SKU-1',
      active: true,
    }));
  });

  it('throws when the referenced lot does not exist', async () => {
    skuRepository.findOne.mockResolvedValue(null);
    lotRepository.findOne.mockResolvedValue(null);

    await expect(service.create({
      id: 'SKU-1',
      lotId: 99,
      productVariantId: 2,
      dateOfEntry: '2026-07-22T00:00:00.000Z',
      quantity: 10,
      unitCost: 12.5,
      bestBeforeDate: '2026-08-22T00:00:00.000Z',
    })).rejects.toThrow('The lot with id #99 could not be found');
  });

  it('soft deletes the sku and its stocks', async () => {
    skuRepository.findOne.mockResolvedValue({ id: 'SKU-1', active: true });
    stockRepository.find.mockResolvedValue([{ id: 1, active: true }, { id: 2, active: false }]);
    skuRepository.save.mockImplementation(async (value) => value);
    stockRepository.save.mockImplementation(async (value) => value);

    const result = await service.remove('SKU-1');

    expect(result.active).toBe(false);
    expect(stockRepository.save).toHaveBeenCalled();
  });
});
