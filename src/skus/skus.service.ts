import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSkusDto } from './dto/create-skus.dto';
import { UpdateSkusDto } from './dto/update-skus.dto';
import { Sku } from './entities/skus.entity';
import { Lot } from '../lots/entities/lot.entity';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { Stock } from '../stocks/entities/stock.entity';

@Injectable()
export class SkusService {
  constructor(
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
    @InjectRepository(Lot)
    private readonly lotRepository: Repository<Lot>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
  ) {}

  private buildSkuId(variantName: string, lotId: number, lotDateOfEntry: Date): string {
    const varietal = variantName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 4);
    const anada = new Date(lotDateOfEntry).getUTCFullYear();
    const lote = `L${String(lotId).padStart(4, '0')}`;
    return `${varietal}-${anada}-${lote}`;
  }

  async create(createSkusDto: CreateSkusDto): Promise<Sku> {
    const lot = await this.lotRepository.findOne({ where: { id: createSkusDto.lotId } });
    if (!lot) {
      throw new NotFoundException(`The lot with id #${createSkusDto.lotId} could not be found`);
    }

    const productVariant = await this.productVariantRepository.findOne({ where: { id: createSkusDto.productVariantId } });
    if (!productVariant) {
      throw new NotFoundException(`The product variant with id #${createSkusDto.productVariantId} could not be found`);
    }

    const generatedId = this.buildSkuId(productVariant.name, lot.id, lot.dateOfEntry);

    const existingSku = await this.skuRepository.findOne({ where: { id: generatedId } });
    if (existingSku) {
      throw new ConflictException(`An SKU with the generated id '${generatedId}' already exists. The combination of variant, lot year and lot id must be unique.`);
    }

    const sku = this.skuRepository.create({
      id: generatedId,
      dateOfEntry: new Date(createSkusDto.dateOfEntry),
      quantity: createSkusDto.quantity,
      unitCost: createSkusDto.unitCost,
      bestBeforeDate: new Date(createSkusDto.bestBeforeDate),
      active: true,
      lot,
      productVariant,
    });

    return await this.skuRepository.save(sku);
  }

  async findAll(active: boolean | undefined): Promise<Sku[]> {
    const where = active === undefined ? {} : { active };
    return await this.skuRepository.find({
      where,
      relations: ['lot', 'productVariant', 'stocks'],
    });
  }

  async findOne(id: string): Promise<Sku> {
    const sku = await this.skuRepository.findOne({
      where: { id },
      relations: ['lot', 'productVariant', 'stocks'],
    });

    if (!sku) {
      throw new NotFoundException(`The sku with id #${id} could not be found`);
    }

    return sku;
  }

  async update(id: string, updateSkusDto: UpdateSkusDto): Promise<Sku> {
    const sku = await this.findOne(id);

    if (updateSkusDto.lotId !== undefined) {
      const lot = await this.lotRepository.findOne({ where: { id: updateSkusDto.lotId } });
      if (!lot) {
        throw new NotFoundException(`The lot with id #${updateSkusDto.lotId} could not be found`);
      }
      sku.lot = lot;
    }

    if (updateSkusDto.productVariantId !== undefined) {
      const productVariant = await this.productVariantRepository.findOne({ where: { id: updateSkusDto.productVariantId } });
      if (!productVariant) {
        throw new NotFoundException(`The product variant with id #${updateSkusDto.productVariantId} could not be found`);
      }
      sku.productVariant = productVariant;
    }

    if (updateSkusDto.dateOfEntry !== undefined) {
      sku.dateOfEntry = new Date(updateSkusDto.dateOfEntry);
    }

    if (updateSkusDto.quantity !== undefined) {
      sku.quantity = updateSkusDto.quantity;
    }

    if (updateSkusDto.unitCost !== undefined) {
      sku.unitCost = updateSkusDto.unitCost;
    }

    if (updateSkusDto.bestBeforeDate !== undefined) {
      sku.bestBeforeDate = new Date(updateSkusDto.bestBeforeDate);
    }

    return await this.skuRepository.save(sku);
  }

  async remove(id: string): Promise<Sku> {
    const sku = await this.findOne(id);
    const stocks = await this.stockRepository.find({ where: { sku: { id } } });

    for (const stock of stocks) {
      stock.active = false;
    }

    if (stocks.length > 0) {
      await this.stockRepository.save(stocks);
    }

    sku.active = false;
    return await this.skuRepository.save(sku);
  }
}
