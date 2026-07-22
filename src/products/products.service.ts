import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  private products: Product[] = [];

  create(createProductDto: CreateProductDto): Product {
    const newProduct: Product = {
      id: this.products.length > 0 ? Math.max(...this.products.map(p => p.id)) + 1 : 1,
      ...createProductDto,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null as any,
      category: null as any,
      provider: null as any,
      variants: [],
    };
    this.products.push(newProduct);
    return newProduct;
  }

  findAll(): Product[] {
    return this.products.filter(p => p.active);
  }

  findOne(id: number): Product | undefined {
    return this.products.find(p => p.id === id && p.active);
  }

  update(id: number, updateProductDto: UpdateProductDto): Product | undefined {
    const index = this.products.findIndex(p => p.id === id && p.active);
    if (index === -1) {
      return undefined;
    }
    this.products[index] = { ...this.products[index], ...updateProductDto, updatedAt: new Date() };
    return this.products[index];
  }

  remove(id: number): boolean {
    const index = this.products.findIndex(p => p.id === id && p.active);
    if (index === -1) {
      return false;
    }
    this.products[index].active = false;
    this.products[index].deletedAt = new Date();
    return true;
  }
}
