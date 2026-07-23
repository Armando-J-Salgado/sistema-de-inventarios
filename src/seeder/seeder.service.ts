import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Lot } from '../lots/entities/lot.entity';
import { ProductVariant } from '../product-variants/entities/product-variant.entity';
import { Product } from '../products/entities/product.entity';
import { Provider } from '../providers/entities/provider.entity';
import { Sku } from '../skus/entities/skus.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Provider)
    private readonly providerRepo: Repository<Provider>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepo: Repository<ProductVariant>,
    @InjectRepository(Lot) private readonly lotRepo: Repository<Lot>,
    @InjectRepository(Sku) private readonly skuRepo: Repository<Sku>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
  ) {}

  async seed() {
    const count = await this.employeeRepo.count();
    if (count >= 1) {
      return;
    }

    //EMPLOYEES ----------------------------------------
    const hashedPassword = await bcrypt.hash('ESEN@2026', 10);
    const admin = this.employeeRepo.create({
      email: 'admin@email.com',
      password: hashedPassword,
      name: 'John Doe',
      address: 'P Sherman 42 Wallaby Way SYDNEY',
      role: 'ADMINISTRATOR',
    });

    const manager1 = this.employeeRepo.create({
      email: 'manager1@email.com',
      password: hashedPassword,
      name: 'Elizabeth Maguire',
      address: '221B Baker Street, New York',
      role: 'WAREHOUSE_MANAGER',
    });

    const manager2 = this.employeeRepo.create({
      email: 'manager2@email.com',
      password: hashedPassword,
      name: 'Rick Sanchez',
      address: '742 Evergreen Terrace, Springfield',
      role: 'WAREHOUSE_MANAGER',
    });

    const analyst = this.employeeRepo.create({
      email: 'analyst@email.com',
      password: hashedPassword,
      name: 'Sydney Schwartzeneger',
      address: '21 Jump Street',
      role: 'ANALYST',
    });

    const users = [admin, manager1, manager2, analyst];

    await this.employeeRepo.save(users);

    //PROVIDERS ----------------------------------------
    const provider1 = this.providerRepo.create({
      email: 'wayne.enterprises@provider.com',
      name: 'Bruce Wayne Supplies',
      address: '1007 Mountain Drive, Gotham City',
    });

    const provider2 = this.providerRepo.create({
      email: 'dailyplanet@provider.com',
      name: 'Daily Planet Logistics',
      address: '355 Broadway, Metropolis',
    });

    const provider3 = this.providerRepo.create({
      email: 'starkindustries@provider.com',
      name: 'Stark Industries Distribution',
      address: '10880 Malibu Point, Malibu',
    });

    const providers = [provider1, provider2, provider3];

    await this.providerRepo.save(providers);

    //WINES CATEGORIES ----------------------------------------
    const category1 = this.categoryRepo.create({
        name: 'Red Wine',
    });

    const category2 = this.categoryRepo.create({
        name: 'White Wine',
    });

    const category3 = this.categoryRepo.create({
        name: 'Rosé Wine',
    });

    const categories = [category1, category2, category3];

    await this.categoryRepo.save(categories);

    //WINES / PRODUCTS ----------------------------------------
    const product1 = this.productRepo.create({
        name: 'Château Developer Cabernet Sauvignon',
        unitOfMeasurement: 'bottles',
        category: category1, // Red Wine
        provider: provider1,
    });

    const product2 = this.productRepo.create({
        name: 'Wizard Reserve Chardonnay',
        unitOfMeasurement: 'bottles',
        category: category2, // White Wine
        provider: provider2,
    });

    const product3 = this.productRepo.create({
        name: 'Galactic Sunset Rosé',
        unitOfMeasurement: 'bottles',
        category: category3, // Rosé Wine
        provider: provider3,
    });

    const products = [product1, product2, product3];

    await this.productRepo.save(products);

    //VARIANTS / SUB-PRODUCTS ----------------------------------------
    const variant1 = this.productVariantRepo.create({
        product: product1,
        name: 'Château Developer Cabernet Sauvignon 750ml',
        description: 'Full-bodied red wine with notes of blackberry, oak, and vanilla.',
        reorderPoint: 24,
    });

    const variant2 = this.productVariantRepo.create({
        product: product1,
        name: 'Château Developer Cabernet Sauvignon Reserve 1.5L',
        description: 'Premium reserve edition aged in oak barrels for 18 months.',
        reorderPoint: 12,
    });

    const variant3 = this.productVariantRepo.create({
        product: product2,
        name: 'Wizard Reserve Chardonnay 750ml',
        description: 'Crisp white wine with hints of citrus, pear, and green apple.',
        reorderPoint: 24,
    });

    const variant4 = this.productVariantRepo.create({
        product: product2,
        name: 'Wizard Reserve Chardonnay Oak Aged 750ml',
        description: 'Smooth Chardonnay with subtle vanilla and butter notes.',
        reorderPoint: 18,
    });

    const variant5 = this.productVariantRepo.create({
        product: product3,
        name: 'Galactic Sunset Rosé 750ml',
        description: 'Refreshing rosé featuring strawberry, raspberry, and floral aromas.',
        reorderPoint: 24,
    });

    const variant6 = this.productVariantRepo.create({
        product: product3,
        name: 'Galactic Sunset Rosé Sparkling 750ml',
        description: 'Sparkling rosé with vibrant fruit flavors and a crisp finish.',
        reorderPoint: 18,
    });

    const variants = [
        variant1,
        variant2,
        variant3,
        variant4,
        variant5,
        variant6,
    ];

    await this.productVariantRepo.save(variants);

    //LOTS ----------------------------------------
    const lot1 = this.lotRepo.create({
        provider: provider1,
        dateOfEntry: new Date('2026-01-15'),
    });

    const lot2 = this.lotRepo.create({
        provider: provider2,
        dateOfEntry: new Date('2026-02-10'),
    });

    const lot3 = this.lotRepo.create({
        provider: provider3,
        dateOfEntry: new Date('2026-03-05'),
    });

    const lots = [lot1, lot2, lot3];

    await this.lotRepo.save(lots);

    //SKU ----------------------------------------
    const sku1 = this.skuRepo.create({
        id: 'PV1-L1-1',
        productVariant: variant1,
        lot: lot1,
        dateOfEntry: lot1.dateOfEntry,
        quantity: 120,
        unitCost: 18.5,
        bestBeforeDate: new Date('2030-01-15'),
    });

    const sku2 = this.skuRepo.create({
        id: 'PV2-L1-2',
        productVariant: variant2,
        lot: lot1,
        dateOfEntry: lot1.dateOfEntry,
        quantity: 60,
        unitCost: 32.0,
        bestBeforeDate: new Date('2031-01-15'),
    });

    const sku3 = this.skuRepo.create({
        id: 'PV3-L2-1',
        productVariant: variant3,
        lot: lot2,
        dateOfEntry: lot2.dateOfEntry,
        quantity: 100,
        unitCost: 15.75,
        bestBeforeDate: new Date('2029-02-10'),
    });

    const sku4 = this.skuRepo.create({
        id: 'PV4-L2-2',
        productVariant: variant4,
        lot: lot2,
        dateOfEntry: lot2.dateOfEntry,
        quantity: 80,
        unitCost: 22.5,
        bestBeforeDate: new Date('2030-02-10'),
    });

    const sku5 = this.skuRepo.create({
        id: 'PV5-L3-1',
        productVariant: variant5,
        lot: lot3,
        dateOfEntry: lot3.dateOfEntry,
        quantity: 110,
        unitCost: 16.25,
        bestBeforeDate: new Date('2029-03-05'),
    });

    const sku6 = this.skuRepo.create({
        id: 'PV6-L3-2',
        productVariant: variant6,
        lot: lot3,
        dateOfEntry: lot3.dateOfEntry,
        quantity: 70,
        unitCost: 21.75,
        bestBeforeDate: new Date('2030-03-05'),
    });

    const skus = [
        sku1,
        sku2,
        sku3,
        sku4,
        sku5,
        sku6,
    ];

    await this.skuRepo.save(skus);

    //WAREHOUSES ----------------------------------------
    const warehouse1 = this.warehouseRepo.create({
        name: "MCM mannor",
        maximumCapacity: 250,
        availableCapacity: 250,
        administrator: manager1
    });

    const warehouse2 = this.warehouseRepo.create({
        name: "Wonka's warehouse",
        maximumCapacity: 150,
        availableCapacity: 150,
        administrator: manager2
    });

    const mainOffice = this.warehouseRepo.create({
        name: "Mc Farland HQ",
        maximumCapacity: 1000,
        availableCapacity: 1000,
        administrator: admin,
    });

    const warehouses = [warehouse1, warehouse2, mainOffice];

    await this.warehouseRepo.save(warehouses);
  }

}
