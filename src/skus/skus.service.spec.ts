import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SkusService } from './skus.service';
import { Sku } from './entities/skus.entity';
import { Lot } from '../lots/entities/lot.entity';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { Stock } from '../stocks/entities/stock.entity';

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

  // ─── buildSkuId (fórmula VARIETAL-AÑADA-LOTE) ──────────────────────────────

  describe('buildSkuId formula', () => {
    /**
     * Accede al método privado mediante casting a any para probarlo aislado.
     * Esto es válido en pruebas unitarias de lógica pura sin efectos secundarios.
     */
    const callBuild = (name: string, id: number, date: Date) =>
      (service as any).buildSkuId(name, id, date);

    it('generates MALB-2021-L0002 for Malbec Reserva 750ml, lot id 2, date 2021-03-15', () => {
      const result = callBuild('Malbec Reserva 750ml', 2, new Date('2021-03-15'));
      expect(result).toBe('MALB-2021-L0002');
    });

    it('pads lot id with leading zeros to 4 digits (id=101 → L0101)', () => {
      const result = callBuild('Pinot Noir', 101, new Date('2023-06-01'));
      expect(result).toBe('PINO-2023-L0101');
    });

    it('strips tildes and accented characters before taking 4 letters (Añejo → ANEJ)', () => {
      const result = callBuild('Añejo Especial', 1, new Date('2022-01-01'));
      expect(result).toBe('ANEJ-2022-L0001');
    });

    it('strips numbers and special characters from the variant name (Cabernet 2.0 XL → CABE)', () => {
      const result = callBuild('Cabernet 2.0 XL', 5, new Date('2024-11-20'));
      expect(result).toBe('CABE-2024-L0005');
    });

    it('uses only the first 4 alphabetic characters in uppercase (merlot → MERL)', () => {
      const result = callBuild('merlot reserva gran cosecha', 3, new Date('2020-07-04'));
      expect(result).toBe('MERL-2020-L0003');
    });

    it('uses the lot dateOfEntry year correctly (year 2026)', () => {
      const result = callBuild('Sauvignon Blanc', 10, new Date('2026-12-31'));
      expect(result).toBe('SAUV-2026-L0010');
    });
  });

  // ─── create() ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    const baseDto = {
      productVariantId: 2,
      lotId: 1,
      dateOfEntry: '2026-07-22T00:00:00.000Z',
      quantity: 10,
      unitCost: 12.5,
      bestBeforeDate: '2026-08-22T00:00:00.000Z',
    };

    it('creates a SKU with the auto-generated id and active=true', async () => {
      lotRepository.findOne.mockResolvedValue({ id: 1, dateOfEntry: new Date('2021-03-15') });
      productVariantRepository.findOne.mockResolvedValue({ id: 2, name: 'Malbec Reserva 750ml' });
      skuRepository.findOne.mockResolvedValue(null);

      const expectedId = 'MALB-2021-L0001';
      const createdSku = { id: expectedId, active: true } as Sku;
      skuRepository.create.mockReturnValue(createdSku);
      skuRepository.save.mockResolvedValue(createdSku);

      const result = await service.create(baseDto);

      expect(result).toBe(createdSku);
      expect(skuRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: expectedId, active: true }),
      );
    });

    it('throws NotFoundException when the lot does not exist', async () => {
      lotRepository.findOne.mockResolvedValue(null);

      await expect(service.create({ ...baseDto, lotId: 99 })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create({ ...baseDto, lotId: 99 })).rejects.toThrow(
        'The lot with id #99 could not be found',
      );
    });

    it('throws NotFoundException when the product variant does not exist', async () => {
      lotRepository.findOne.mockResolvedValue({ id: 1, dateOfEntry: new Date('2021-03-15') });
      productVariantRepository.findOne.mockResolvedValue(null);

      await expect(service.create({ ...baseDto, productVariantId: 999 })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.create({ ...baseDto, productVariantId: 999 })).rejects.toThrow(
        'The product variant with id #999 could not be found',
      );
    });

    it('throws ConflictException when the generated id already exists', async () => {
      lotRepository.findOne.mockResolvedValue({ id: 1, dateOfEntry: new Date('2021-03-15') });
      productVariantRepository.findOne.mockResolvedValue({ id: 2, name: 'Malbec Reserva 750ml' });
      skuRepository.findOne.mockResolvedValue({ id: 'MALB-2021-L0001', active: true }); // ya existe

      await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
      await expect(service.create(baseDto)).rejects.toThrow('MALB-2021-L0001');
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns the SKU with relations when it exists', async () => {
      const mockSku = { id: 'MALB-2021-L0001', active: true } as Sku;
      skuRepository.findOne.mockResolvedValue(mockSku);

      const result = await service.findOne('MALB-2021-L0001');

      expect(result).toBe(mockSku);
      expect(skuRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'MALB-2021-L0001' } }),
      );
    });

    it('throws NotFoundException when the SKU does not exist', async () => {
      skuRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('NONEXISTENT')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('NONEXISTENT')).rejects.toThrow(
        'The sku with id #NONEXISTENT could not be found',
      );
    });
  });

  // ─── remove() ──────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('sets active=false on the SKU and all its associated stocks', async () => {
      skuRepository.findOne.mockResolvedValue({ id: 'MALB-2021-L0001', active: true });
      stockRepository.find.mockResolvedValue([
        { id: 1, active: true },
        { id: 2, active: true },
      ]);
      skuRepository.save.mockImplementation(async (value) => value);
      stockRepository.save.mockImplementation(async (value) => value);

      const result = await service.remove('MALB-2021-L0001');

      expect(result.active).toBe(false);
      expect(stockRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ active: false }),
        ]),
      );
    });

    it('throws NotFoundException when the SKU does not exist', async () => {
      skuRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('NONEXISTENT')).rejects.toThrow(NotFoundException);
    });

    it('skips stockRepository.save when there are no associated stocks', async () => {
      skuRepository.findOne.mockResolvedValue({ id: 'MALB-2021-L0001', active: true });
      stockRepository.find.mockResolvedValue([]);
      skuRepository.save.mockImplementation(async (value) => value);

      await service.remove('MALB-2021-L0001');

      expect(stockRepository.save).not.toHaveBeenCalled();
    });
  });
});
