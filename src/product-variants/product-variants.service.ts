import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariant } from './entities/product-variant.entity';

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly repository: Repository<ProductVariant>,
  ) {}

  async create(createProductVariantDto: CreateProductVariantDto): Promise<ProductVariant> {
    const { productId, ...rest } = createProductVariantDto;
    const variant = this.repository.create({ ...rest, product: { id: productId } as ProductVariant['product'] });
    return await this.repository.save(variant);
  }

  async findAll(): Promise<ProductVariant[]> {
    return await this.repository.find({ where: { active: true } });
  }

  async findOne(id: number): Promise<ProductVariant> {
    const variant = await this.repository.findOne({ where: { id } });
    if (!variant) {
      throw new NotFoundException(`The product variant with id #${id} could not be found`);
    }
    return variant;
  }

  async update(id: number, updateProductVariantDto: UpdateProductVariantDto): Promise<ProductVariant> {
    const variant = await this.findOne(id);
    const updatedVariant = Object.assign(variant, updateProductVariantDto);
    return await this.repository.save(updatedVariant);
  }

  async remove(id: number): Promise<ProductVariant> {
    const variant = await this.findOne(id);
    variant.active = false;
    return await this.repository.save(variant);
  }
}
