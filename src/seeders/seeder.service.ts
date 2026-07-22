import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Employee } from 'src/employees/entities/employee.entity';
import { Provider } from 'src/providers/entities/provider.entity';
import { Product } from 'src/products/entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Stock } from 'src/stocks/entities/stock.entity';
import { Movement } from 'src/movements/entities/movement.entity';
import { Reservation } from 'src/reservations/entities/reservation.entity';
import { CategoriesService } from 'src/categories/categories.service';
import { ProductVariantsService } from 'src/product-variants/product-variants.service';
import { LotsService } from 'src/lots/lots.service';
import { SkusService } from 'src/skus/skus.service';
import { WarehousesService } from 'src/warehouses/warehouses.service';
import { MovementsService } from 'src/movements/movements.service';
import { ReservationsService } from 'src/reservations/reservations.service';
import { LotState } from 'src/lots/enums/lot-state.enum';
import { MovementStatus, MovementType, ReceiveDecision } from 'src/enums/movement-type.enum';
import { ReservationStatus } from 'src/reservations/enums/reservation-status.enum';

const ADMIN_EMAIL = 'admin@inventory.com';
const DAY_MS = 24 * 60 * 60 * 1000;

export class SeederService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly employeeRepository: Repository<Employee>,
    private readonly providerRepository: Repository<Provider>,
    private readonly productRepository: Repository<Product>,
    private readonly categoriesService: CategoriesService,
    private readonly productVariantsService: ProductVariantsService,
    private readonly lotsService: LotsService,
    private readonly skusService: SkusService,
    private readonly warehousesService: WarehousesService,
    private readonly movementsService: MovementsService,
    private readonly reservationsService: ReservationsService,
    private readonly stockRepository: Repository<Stock>,
    private readonly movementRepository: Repository<Movement>,
    private readonly reservationRepository: Repository<Reservation>,
  ) {}

  async run(options: { fresh: boolean }): Promise<void> {
    const existingAdmin = await this.employeeRepository.findOne({ where: { email: ADMIN_EMAIL } });
    if (existingAdmin && !options.fresh) {
      console.log('Seed data already exists. Use --fresh to reset.');
      return;
    }

    if (options.fresh) {
      await this.truncateAll();
    }

    const employees = await this.seedEmployees();
    const warehouses = await this.seedWarehouses(employees);
    const catalog = await this.seedCatalog();
    const lots = await this.seedLots(catalog.provider.id);
    const skus = await this.seedSkus(catalog.variantClasico.id, catalog.variantDescafeinado.id, lots);
    const movements = await this.seedMovements(employees, warehouses, skus, catalog);
    const reservation = await this.seedReservation(employees, movements.stockClaL2CentralId);

    await this.verifyInvariant();

    this.printSummary({ employees, warehouses, catalog, lots, skus, movements, reservation });
  }

  private async truncateAll(): Promise<void> {
    const tables = this.dataSource.entityMetadatas.map((metadata) => `"${metadata.tableName}"`).join(', ');
    await this.dataSource.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
  }

  private async seedEmployees() {
    const specs = [
      {
        email: ADMIN_EMAIL,
        password: 'Admin123!',
        role: 'ADMINISTRATOR',
        name: 'Ana Administradora',
        address: 'Colonia Escalon, San Salvador',
      },
      {
        email: 'manager.central@inventory.com',
        password: 'Manager123!',
        role: 'WAREHOUSE_MANAGER',
        name: 'Carlos Central',
        address: 'Bodega Central, San Salvador',
      },
      {
        email: 'manager.norte@inventory.com',
        password: 'Manager123!',
        role: 'WAREHOUSE_MANAGER',
        name: 'Nora Norte',
        address: 'Bodega Norte, Santa Ana',
      },
      {
        email: 'analyst@inventory.com',
        password: 'Analyst123!',
        role: 'ANALYST',
        name: 'Alex Analista',
        address: 'Colonia Miralvalle, San Salvador',
      },
    ];

    const saved: Record<string, Employee> = {};
    for (const spec of specs) {
      const hashedPassword = await bcrypt.hash(spec.password, 10);
      const employee = this.employeeRepository.create({
        email: spec.email,
        password: hashedPassword,
        name: spec.name,
        address: spec.address,
        role: spec.role,
        active: true,
      });
      saved[spec.email] = await this.employeeRepository.save(employee);
    }

    return {
      admin: saved[ADMIN_EMAIL],
      managerCentral: saved['manager.central@inventory.com'],
      managerNorte: saved['manager.norte@inventory.com'],
      analyst: saved['analyst@inventory.com'],
      credentials: specs.map(({ email, password, role }) => ({ email, password, role })),
    };
  }

  private async seedWarehouses(employees: Awaited<ReturnType<SeederService['seedEmployees']>>) {
    const central = await this.warehousesService.create({
      name: 'Bodega Central',
      maximumCapacity: 500,
      administratorId: employees.managerCentral.id,
    });
    const norte = await this.warehousesService.create({
      name: 'Bodega Norte',
      maximumCapacity: 100,
      administratorId: employees.managerNorte.id,
    });
    return { central, norte };
  }

  private async seedCatalog() {
    const category = await this.categoriesService.create({ name: 'Bebidas' });

    const provider = this.providerRepository.create({
      name: 'Distribuidora El Salvador',
      address: 'Km 12 Carretera Panamericana, San Salvador',
      email: 'contacto@distribuidoraelsalvador.com',
      active: true,
    });
    const savedProvider = await this.providerRepository.save(provider);

    const product = this.productRepository.create({
      name: 'Cafe Molido',
      unitOfMeasurement: 'bolsa 500g',
      category: { id: category.id } as Category,
      provider: { id: savedProvider.id } as Provider,
      active: true,
    });
    const savedProduct = await this.productRepository.save(product);

    const variantClasico = await this.productVariantsService.create({
      name: 'Cafe Molido Clasico',
      description: 'Presentacion clasica de cafe molido en bolsa de 500g',
      reorderPoint: 15,
      productId: savedProduct.id,
    });

    const variantDescafeinado = await this.productVariantsService.create({
      name: 'Cafe Molido Descafeinado',
      description: 'Presentacion descafeinada de cafe molido en bolsa de 500g',
      reorderPoint: 10,
      productId: savedProduct.id,
    });

    return { category, provider: savedProvider, product: savedProduct, variantClasico, variantDescafeinado };
  }

  private async seedLots(providerId: number) {
    const now = new Date();
    const l1 = await this.lotsService.create({ providerId, dateOfEntry: now, state: LotState.RECEIVED });
    const l2 = await this.lotsService.create({ providerId, dateOfEntry: now, state: LotState.RECEIVED });
    const l3 = await this.lotsService.create({ providerId, dateOfEntry: now, state: LotState.PENDING });
    return { l1, l2, l3 };
  }

  private async seedSkus(
    variantClasicoId: number,
    variantDescafeinadoId: number,
    lots: Awaited<ReturnType<SeederService['seedLots']>>,
  ) {
    const today = new Date();
    const plusDays = (days: number) => new Date(today.getTime() + days * DAY_MS).toISOString();

    const claL1 = await this.skusService.create({
      id: 'CAFE-CLA-L1',
      productVariantId: variantClasicoId,
      lotId: lots.l1.id,
      dateOfEntry: today.toISOString(),
      quantity: 120,
      unitCost: 4.5,
      bestBeforeDate: plusDays(30),
    });
    const claL2 = await this.skusService.create({
      id: 'CAFE-CLA-L2',
      productVariantId: variantClasicoId,
      lotId: lots.l2.id,
      dateOfEntry: today.toISOString(),
      quantity: 80,
      unitCost: 5.0,
      bestBeforeDate: plusDays(60),
    });
    const desL1 = await this.skusService.create({
      id: 'CAFE-DES-L1',
      productVariantId: variantDescafeinadoId,
      lotId: lots.l1.id,
      dateOfEntry: today.toISOString(),
      quantity: 60,
      unitCost: 6.0,
      bestBeforeDate: plusDays(45),
    });
    const claL3 = await this.skusService.create({
      id: 'CAFE-CLA-L3',
      productVariantId: variantClasicoId,
      lotId: lots.l3.id,
      dateOfEntry: today.toISOString(),
      quantity: 50,
      unitCost: 4.0,
      bestBeforeDate: plusDays(90),
    });

    return { claL1, claL2, desL1, claL3 };
  }

  private async seedMovements(
    employees: Awaited<ReturnType<SeederService['seedEmployees']>>,
    warehouses: Awaited<ReturnType<SeederService['seedWarehouses']>>,
    skus: Awaited<ReturnType<SeederService['seedSkus']>>,
    catalog: Awaited<ReturnType<SeederService['seedCatalog']>>,
  ) {
    const managerCentralId = employees.managerCentral.id;
    const managerNorteId = employees.managerNorte.id;
    const centralId = warehouses.central.id;
    const norteId = warehouses.norte.id;
    const variantClasicoId = catalog.variantClasico.id;

    await this.movementsService.createEntry({
      quantity: 40,
      skuId: skus.claL1.id,
      warehouseId: centralId,
      employeeId: managerCentralId,
    });
    await this.movementsService.createEntry({
      quantity: 30,
      skuId: skus.claL2.id,
      warehouseId: centralId,
      employeeId: managerCentralId,
    });
    await this.movementsService.createEntry({
      quantity: 20,
      skuId: skus.desL1.id,
      warehouseId: centralId,
      employeeId: managerCentralId,
    });

    await this.movementsService.createEntry({
      quantity: 20,
      skuId: skus.claL1.id,
      warehouseId: norteId,
      employeeId: managerNorteId,
    });

    await this.movementsService.createIssue({
      quantity: 10,
      productVariantId: variantClasicoId,
      warehouseId: centralId,
      employeeId: managerCentralId,
    });

    const completedTransfer = await this.movementsService.createTransfer({
      quantity: 15,
      productVariantId: variantClasicoId,
      originWarehouseId: centralId,
      destinationWarehouseId: norteId,
      employeeId: managerCentralId,
    });
    const completedTransferGroupId = completedTransfer[0].transferGroupId;
    await this.movementsService.receiveTransfer({
      transferGroupId: completedTransferGroupId,
      employeeId: managerNorteId,
      decision: ReceiveDecision.ACCEPT,
    });

    const pendingTransfer = await this.movementsService.createTransfer({
      quantity: 10,
      productVariantId: variantClasicoId,
      originWarehouseId: centralId,
      destinationWarehouseId: norteId,
      employeeId: managerCentralId,
    });
    const pendingTransferGroupId = pendingTransfer[0].transferGroupId;

    const stockClaL2Central = await this.stockRepository.findOne({
      where: { sku: { id: skus.claL2.id }, warehouse: { id: centralId } },
    });
    if (!stockClaL2Central) {
      throw new Error('Expected stock for CAFE-CLA-L2 in Bodega Central was not found after seeding movements');
    }

    return {
      completedTransferGroupId,
      pendingTransferGroupId,
      stockClaL2CentralId: stockClaL2Central.id,
    };
  }

  private async seedReservation(
    employees: Awaited<ReturnType<SeederService['seedEmployees']>>,
    stockId: number,
  ) {
    const syntheticUser = { employeeId: employees.admin.id, roles: 'ADMINISTRATOR' };
    const fromDate = new Date().toISOString();
    const toDate = new Date(Date.now() + 30 * DAY_MS).toISOString();
    return this.reservationsService.create(
      { sourceStockId: stockId, quantity: 10, fromDate, toDate },
      syntheticUser,
    );
  }

  private async verifyInvariant(): Promise<void> {
    const stocks = await this.stockRepository.find({ relations: { sku: true, warehouse: true } });
    const problems: string[] = [];

    for (const stock of stocks) {
      const movements = await this.movementRepository.find({
        where: [{ sourceStock: { id: stock.id } }, { destinationStock: { id: stock.id } }],
        relations: { sourceStock: true, destinationStock: true },
      });

      let computed = 0;
      for (const movement of movements) {
        const isSource = movement.sourceStock?.id === stock.id;
        const isDestination = movement.destinationStock?.id === stock.id;

        if (movement.type === MovementType.ENTRANCE && isSource) {
          computed += movement.quantity;
        } else if (movement.type === MovementType.ISSUE && isSource) {
          computed -= movement.quantity;
        } else if (movement.type === MovementType.TRANSFER) {
          if (isSource && (movement.status === MovementStatus.IN_TRANSIT || movement.status === MovementStatus.COMPLETED)) {
            computed -= movement.quantity;
          }
          if (isDestination && movement.status === MovementStatus.COMPLETED) {
            computed += movement.quantity;
          }
        }
      }

      if (computed !== stock.quantity) {
        problems.push(
          `Stock #${stock.id} (sku ${stock.sku?.id}, warehouse #${stock.warehouse?.id}): expected ${computed}, actual ${stock.quantity}`,
        );
      }

      const activeReservations = await this.reservationRepository.find({
        where: { stock: { id: stock.id }, status: ReservationStatus.ACTIVE },
      });
      const reservedQuantity = activeReservations.reduce((sum, reservation) => sum + reservation.quantity, 0);
      if (reservedQuantity > stock.quantity) {
        problems.push(`Stock #${stock.id}: active reservations (${reservedQuantity}) exceed quantity (${stock.quantity})`);
      }
    }

    if (problems.length > 0) {
      console.error('Invariant check FAILED:');
      problems.forEach((problem) => console.error(` - ${problem}`));
      throw new Error('Invariant check failed');
    }

    console.log('invariant check: OK');
  }

  private printSummary(data: {
    employees: Awaited<ReturnType<SeederService['seedEmployees']>>;
    warehouses: Awaited<ReturnType<SeederService['seedWarehouses']>>;
    catalog: Awaited<ReturnType<SeederService['seedCatalog']>>;
    lots: Awaited<ReturnType<SeederService['seedLots']>>;
    skus: Awaited<ReturnType<SeederService['seedSkus']>>;
    movements: Awaited<ReturnType<SeederService['seedMovements']>>;
    reservation: Awaited<ReturnType<SeederService['seedReservation']>>;
  }): void {
    console.log('\n=== Seed summary ===');
    console.log('\nCredentials:');
    data.employees.credentials.forEach((credential) => {
      console.log(`  ${credential.role.padEnd(18)} ${credential.email}  /  ${credential.password}`);
    });

    console.log('\nWarehouses:');
    console.log(`  Bodega Central: id=${data.warehouses.central.id}`);
    console.log(`  Bodega Norte:   id=${data.warehouses.norte.id}`);

    console.log('\nProduct variants:');
    console.log(`  Cafe Molido Clasico:       id=${data.catalog.variantClasico.id}`);
    console.log(`  Cafe Molido Descafeinado:  id=${data.catalog.variantDescafeinado.id}`);

    console.log('\nLots:');
    console.log(`  L1 (RECEIVED): id=${data.lots.l1.id}`);
    console.log(`  L2 (RECEIVED): id=${data.lots.l2.id}`);
    console.log(`  L3 (PENDING):  id=${data.lots.l3.id}`);

    console.log('\nStocks:');
    console.log(`  CAFE-CLA-L2 @ Bodega Central: stockId=${data.movements.stockClaL2CentralId}`);

    console.log('\nReservation:');
    console.log(`  id=${data.reservation.id} (10 units on stock #${data.movements.stockClaL2CentralId}, ACTIVE)`);

    console.log('\nTransfers:');
    console.log(`  Completed transferGroupId: ${data.movements.completedTransferGroupId}`);
    console.log(`  Pending (IN_TRANSIT) transferGroupId: ${data.movements.pendingTransferGroupId}`);
    console.log('\n=====================\n');
  }
}
