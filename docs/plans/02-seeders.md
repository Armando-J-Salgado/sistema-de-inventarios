# Plan 02 — Seeders del sistema

> Plan autocontenido para ejecutar con un LLM. **Prerequisitos: Plan 00 (fixes analytics/alertas) y Plan 01 (CRUD Warehouses) ya mergeados** — el seeder usa `WarehousesService.create` real. El Plan 03 (colección Postman) depende de los datos y credenciales exactas definidas aquí.

## Contexto del repo

- NestJS 11 + TypeORM 0.3 + Postgres. `synchronize: true` (tablas se autocrean al boot, sin migraciones). `.env` cargado por `import 'dotenv/config'` en `src/app.module.ts` (no hay `@nestjs/config`). Vars: `DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, SECRET_KEY, PORT`.
- Dominio: Category → Product → ProductVariant → Sku (Sku pertenece a un Lot, que pertenece a un Provider). `Stock` = Sku en una Warehouse. `Reservation` y `Movement` cuelgan de Stock. `Employee` (roles ADMINISTRATOR / WAREHOUSE_MANAGER / ANALYST) administra una Warehouse (OneToOne).
- **Regla de negocio clave del spec**: al crear un movimiento de ENTRADA se **resta la cantidad del SKU** (`sku.quantity` es el remanente del lote) y se suma al Stock de la bodega. Invariante: `stock.quantity = entradas − salidas + transferencias-in COMPLETED − transferencias-out COMPLETED`, y `Σ reservas ACTIVE de un stock ≤ stock.quantity`.
- `MovementsService` (`src/movements/movements.service.ts`, exportado por `MovementsModule`) delega en estrategias (`src/strategies/`) que ya implementan esa lógica (FEFO por `bestBeforeDate ASC`, transacciones, capacidad de bodega). **Por eso los movimientos del seed se crean llamando estos métodos, jamás insertando filas `Movement` a mano** — el invariante se cumple por construcción.
- Firmas/DTOs relevantes (verificar en `src/movements/dto/` antes de usar):
  - `createEntry({ quantity, skuId: string, warehouseId, employeeId })`
  - `createIssue({ quantity, productVariantId, warehouseId, employeeId })`
  - `createTransfer({ quantity, productVariantId, originWarehouseId, destinationWarehouseId, employeeId })` → Movements con status `IN_TRANSIT` + `transferGroupId` (UUID)
  - `receiveTransfer({ transferGroupId, employeeId, decision: 'ACCEPT' | 'REJECT' })`
  - Reservas: `ReservationsService.create(...)` — **verificar firma** en `src/reservations/reservations.service.ts`; recibe el DTO `{ sourceStockId, quantity, fromDate, toDate }` y un objeto user del request. Pasar user sintético `{ employeeId: <adminId>, roles: 'ADMINISTRATOR' }`.
  - `CreateSkusDto`: `{ id: string, productVariantId, lotId, dateOfEntry: ISO, quantity, unitCost, bestBeforeDate: ISO }`.
  - `CreateLotDto`: `{ providerId, dateOfEntry, state?: 'PENDING'|'RECEIVED'|'CLOSED' }` (default RECEIVED). Un lot `PENDING` bloquea entradas de sus SKUs (400) — se siembra uno a propósito para escenarios negativos.
- Restricciones RBAC en estrategias: `warehouse-manager-permission` pasa si el employee es ADMINISTRATOR o el administrator de la bodega (origen para entry/issue/transfer; **destino** para receive-transfer).
- Passwords: `EmployeesService.create` usa `bcrypt.hash(password, 10)` — replicar cost 10.
- Convención imports: absolutos `src/...`.

## Diseño

Script standalone: `NestFactory.createApplicationContext(AppModule)` — obtiene servicios reales por DI sin levantar HTTP. Solo lo imposible por servicios va por repositorio directo (empleados, porque `POST /employees` exige token y el primer admin no existe).

### Archivos nuevos

1. **`src/seeders/seed.ts`** — entrypoint: crea el contexto, lee flag `--fresh` de `process.argv`, llama `SeederService.run({ fresh })`, cierra contexto, `process.exit(0)` / `exit(1)` con error.
2. **`src/seeders/seeder.service.ts`** — toda la lógica (detallada abajo).
3. **`src/seeders/seeder.module.ts`** — módulo que importa `AppModule` no es necesario: el contexto se crea sobre `AppModule` directamente y los servicios se obtienen con `app.get(XService)`. Si algún service no está exportado por su módulo (verificar: `CategoriesService`, `ProvidersService`, `ProductsService`, `ProductVariantsService`, `LotsService`, `SkusService`, `WarehousesService`, `ReservationsService`, `MovementsService`), añadir `exports: [XService]` a ese módulo — cambio mínimo permitido. Para repositorios usar `app.get(getRepositoryToken(Employee))`.
4. **`package.json`** — añadir script: `"seed": "ts-node -r tsconfig-paths/register src/seeders/seed.ts"` (ts-node y tsconfig-paths ya son devDependencies). `npm run seed -- --fresh` para re-sembrar.

### `SeederService.run({ fresh })`

**Idempotencia**: si existe employee con email `admin@inventory.com` y NO se pasó `--fresh` → imprimir "Seed data already exists. Use --fresh to reset." y salir sin tocar nada.

**`--fresh`**: truncar TODAS las tablas antes de sembrar, robusto ante nombres: iterar `dataSource.entityMetadatas` y ejecutar `TRUNCATE TABLE "t1","t2",... RESTART IDENTITY CASCADE` en un solo statement.

**Datos (en orden de dependencias; guardar los IDs retornados):**

1. **Empleados** (repositorio + bcrypt cost 10) — credenciales fijas, las usa el Plan 03:
   | Email | Password | Rol |
   |---|---|---|
   | `admin@inventory.com` | `Admin123!` | ADMINISTRATOR |
   | `manager.central@inventory.com` | `Manager123!` | WAREHOUSE_MANAGER |
   | `manager.norte@inventory.com` | `Manager123!` | WAREHOUSE_MANAGER |
   | `analyst@inventory.com` | `Analyst123!` | ANALYST |
   (revisar campos obligatorios de la entity Employee: `name`, `address`, etc.)
2. **Bodegas** (vía `WarehousesService.create` del Plan 01):
   - `Bodega Central` — maximumCapacity 500, administratorId = manager.central
   - `Bodega Norte` — maximumCapacity 100 (chica a propósito: escenarios de capacidad insuficiente), administratorId = manager.norte
3. **Catálogo** (services): categoría `Bebidas`; proveedor `Distribuidora El Salvador` (name solo letras/espacios — validación del DTO); producto `Cafe Molido` (unitOfMeasurement `bolsa 500g`; ojo: el DTO de product valida name solo letras/espacios, sin números ni tildes si el regex no las admite — verificar `create-product.dto.ts`); variantes: `Cafe Molido Clasico` reorderPoint **15** y `Cafe Molido Descafeinado` reorderPoint **10** (bajos para que la colección dispare need-reorder/alertas con un issue).
4. **Lotes**: L1 RECEIVED, L2 RECEIVED, L3 **PENDING** (para el negativo 400 de la colección).
5. **SKUs** (fechas relativas a hoy para que FEFO sea estable):
   | id | variante | lote | quantity | unitCost | bestBeforeDate |
   |---|---|---|---|---|---|
   | `CAFE-CLA-L1` | Clasico | L1 | 120 | 4.50 | +30 días |
   | `CAFE-CLA-L2` | Clasico | L2 | 80 | 5.00 | +60 días |
   | `CAFE-DES-L1` | Descafeinado | L1 | 60 | 6.00 | +45 días |
   | `CAFE-CLA-L3` | Clasico | L3 (PENDING) | 50 | 4.00 | +90 días |
6. **Movimientos** (vía `MovementsService`, employeeId = manager de la bodega correspondiente):
   - Entradas en Central (manager.central): 40 de `CAFE-CLA-L1`, 30 de `CAFE-CLA-L2`, 20 de `CAFE-DES-L1`.
   - Entrada en Norte (manager.norte): 20 de `CAFE-CLA-L1`.
   - Issue en Central (manager.central): 10 de variante Clasico (FEFO la saca del stock de L1).
   - Transferencia COMPLETADA: 15 de Clasico, Central→Norte (`createTransfer` con manager.central) + `receiveTransfer ACCEPT` (manager.norte — el permiso se valida contra el destino).
   - Transferencia **dejada IN_TRANSIT**: 10 de Clasico, Central→Norte, sin recibir — la colección Postman la acepta/rechaza en vivo. **Imprimir su `transferGroupId` en el resumen.**
   - NO sembrar entradas del SKU `CAFE-CLA-L3` (su lote PENDING lo bloquea — es el escenario negativo).
7. **Reserva** (vía `ReservationsService` con user sintético admin): 10 unidades sobre el stock de `CAFE-CLA-L2` en Central, fromDate hoy, toDate +30 días → queda ACTIVE. (Estado esperado tras todo: stock Clasico Central = L1: 40−10−15−10=5, L2: 30; disponible = 35−10 reservadas = 25 ≥ 0 ✔; reorderPoint 15 no disparado aún — la colección lo dispara.)

**Auto-verificación del invariante (obligatoria, al final):** para cada Stock, recomputar desde la tabla Movement: `Σ entradas − Σ issues − Σ transf-out COMPLETED/IN_TRANSIT + Σ transf-in COMPLETED` y comparar con `stock.quantity`; verificar además `Σ reservas ACTIVE ≤ stock.quantity`. **Antes de codificarlo, leer `src/strategies/entrance-movement.strategy.ts` y `transfer-movement.strategy.ts` para confirmar en qué campo queda el stock (sourceStock vs destinationStock) por tipo, y en qué momento se descuenta el origen en transferencias (se descuenta al crear, con IN_TRANSIT).** Si algún stock no cuadra: imprimir el detalle y `process.exit(1)`.

**Resumen final por consola**: credenciales, IDs de bodegas/variantes/stocks/reserva, `transferGroupId` pendiente, y "invariant check: OK".

## Fuera de alcance

No tocar `AppModule` (el seeder vive fuera; solo `exports` puntuales en módulos si faltan). No tocar estrategias ni `src/events/movement.listener.ts`.

## Definition of Done

- `npm run seed` sobre BD vacía: siembra todo, invariante OK, resumen impreso.
- Segunda corrida sin `--fresh`: aborta con mensaje claro, sin duplicar nada.
- `npm run seed -- --fresh`: trunca y re-siembra correctamente.
- `npm run build`, `npm run lint`, `npm test` siguen en verde.

## Commit

```
Feat: add database seeders
```
