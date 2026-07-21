# Plan de Implementación — Tareas de Alex (Sistema de Inventario Multi-Bodega)

> Documento pensado para ser retomado por cualquier modelo. Contiene contexto técnico, modelo de datos real, costuras de integración con el equipo, y tareas en **flujo TDD** con edge cases explícitos.
>
> Fecha: 2026-07-20 · Fuente del reparto: `docs/Asignacion de Tareas - Alex.md`

## Contexto

El equipo desarrolla una API RESTful de inventario multi-bodega (NestJS 11 + TypeORM + PostgreSQL + Swagger + JWT) como proyecto final ESEN. Las tareas se repartieron por módulo. A **Alex** le corresponden **13 tareas** (Alternativa B):

| Módulo | Tareas | Reto de negocio que cubre |
| --- | --- | --- |
| **Stock** | Service, Controller, Module, Tests | "Stock disponible real-time" = existencias − reservas |
| **Alert** | Service, Controller, Module, Tests | Alerta cuando el stock cae bajo el `reorderPoint` de la variante |
| **Product Variant** | Service, Controller, Module, Tests | CRUD con relaciones (product, sku, alerts, reorderPoint) |
| **Docs README.md** | 1 | Documentación general del proyecto |

**Fuera del alcance de Alex**: SKU/PEPS, Reservations, Movements (Armando), Product, Lot, Employee, Analytics, Auth (Armando), Categories (Armando), Provider (Giselle).

## Estado actual del código (verificado)

- Andamiaje de `nest g resource` presente en todos los módulos.
- **Entidades ya modeladas con relaciones** — incluidas `Stock`, `Alert`, `ProductVariant`. No hay que crear entidades.
- **DTOs vacíos**: p.ej. `src/stocks/dto/create-stock.dto.ts` → `export class CreateStockDto {}`.
- **Servicios y controladores en mock**: retornan strings tipo `'This action returns all stocks'`.
- **Infra transversal lista** (Armando): Swagger en `/api` desde `src/main.ts` (falta `ValidationPipe` global — Tarea 0), y guards en `src/jwt/`:
  - `JwtAuthGuard` → `src/jwt/jwt.guard.ts`
  - `RolesGuard` → `src/jwt/roles/roles.guard.ts`
  - `@Roles(...)` + `ROLES_KEY` → `src/jwt/roles/roles.decorator.ts`
- `app.module.ts` ya registra entidades y módulos; `synchronize: true` (dev).
- `better-sqlite3` instalado → usable para e2e con DB en memoria.

## Modelo de datos relevante (real, tomado del código)

```
ProductVariant (reorderPoint) 1──N Sku 1──N Stock (quantity, warehouse) 1──N Reservation (quantity, status)
                                              └──N Movement (source/destination)
```

- `Stock`: `id, quantity, active, sku, warehouse, reservations, sourceMovements, destinationMovements` (+ `deletedAt` soft delete).
- `Alert`: `id, title, description, createdAt, productVariant`. Ojo: enlaza a **ProductVariant**, no a SKU.
- `ProductVariant`: `id, name, description, reorderPoint, active, product, skus, alerts` (+ soft delete).
- `Reservation`: `id, quantity, fromDate, toDate, status (string), stock`.

**Fórmulas clave:**
- Disponible de una fila `Stock` = `quantity − Σ(reservas activas)`.
- Disponible por variante/bodega = suma sobre los `Stock` de los `Sku` de esa `ProductVariant`.

## Costuras de integración (coordinar — NO son de Alex)

1. **Escritura de `Stock.quantity`**: la mutan entradas/salidas/transferencias del `MovementService` (Armando). Alex es dueño del **lado lectura**. Confirmar que Movement es el único que escribe, y transaccionalmente.
2. **`Reservation.status`**: módulo sin asignar. Alex **lee** `Reservation` vía repositorio. **Decisión pendiente**: fijar los estados que cuentan como "activos" (la entidad ejemplifica `'PENDING'`; el spec menciona `ACTIVA/COMPLETADA/CANCELADA`). Mientras tanto, centralizar en una constante `ACTIVE_RESERVATION_STATUSES` dentro del módulo Stock para cambiarla en un solo lugar.
3. **Disparo de alertas**: el spec propone `movement.listener.ts` con `@OnEvent('movement.created')`. Acordar el nombre del evento con Armando; entretanto `AlertsService.evaluateAndGenerate()` queda público e invocable manualmente.

## Convenciones a respetar (del código existente)

- **Controller**: `@ApiTags`, `@ApiOperation`/`@ApiResponse`, `@ApiBearerAuth()`, `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
- **Module**: `imports: [TypeOrmModule.forFeature([...])]`; exportar el service si otro módulo lo consume.
- **Service**: `@InjectRepository(Entity) private repo: Repository<Entity>`; errores con `NotFoundException`/`BadRequestException`.
- **DTOs**: `class-validator` + `@ApiProperty`; `Update*Dto extends PartialType(Create*Dto)`.
- **Tests**: mock de repos con `getRepositoryToken(Entity)`. Cobertura ≥ 70% (rúbrica).

---

# Metodología: TDD estricto

Cada tarea de implementación sigue **RED → GREEN → REFACTOR**:

1. **RED** — escribir el `.spec.ts` con los casos (incluidos edge cases) y ver que **falla** (`npm test <módulo>` en rojo por la razón esperada, no por error de importación).
2. **GREEN** — escribir el mínimo código que pone los tests en verde.
3. **REFACTOR** — limpiar (extraer helpers, quitar duplicación) manteniendo la suite verde.

> Nota sobre el reparto: las 4 tareas asignadas por módulo eran *Service, Controller, Module, Tests*. Bajo TDD los tests dejan de ser una tarea final y se distribuyen al inicio de cada ciclo; la cuarta tarea de cada módulo pasa a ser **cobertura + e2e**, que sigue cumpliendo el entregable "Tests".

Los archivos `*.spec.ts` ya existen como scaffold vacío en cada módulo — se reescriben, no se crean de cero.

---

## Tareas

Orden: ProductVariant (CRUD simple, aporta `reorderPoint` a Alert) → Stock (disponible real-time) → Alert (depende de ambos) → README → Verificación.

- [ ] **Tarea 0 — Prerrequisito transversal:** añadir `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` en `src/main.ts`. Sin esto los `class-validator` de los DTOs no corren y los tests de validación (400) fallan. → **Verificar**: POST con body inválido devuelve `400`. *(Si Armando ya lo agregó, omitir.)*

### Product Variant (4)

- [ ] **PV-1 (RED→GREEN) Service:** escribir primero `product-variants.service.spec.ts`, luego implementar `create/findAll/findOne/update/remove` con `Repository<ProductVariant>`; `remove` = `softDelete`.
  - Casos base: create, findAll, findOne, update parcial, soft remove.
  - **Edge cases**: `findOne` con id inexistente → `NotFoundException`; `update` parcial **no** debe sobrescribir campos no enviados (p.ej. mandar solo `name` conserva `reorderPoint`); registros soft-deleted **no** aparecen en `findAll`; `remove` sobre uno ya eliminado → `NotFoundException`.
  → **Verificar**: `npm test product-variants.service` verde.
- [ ] **PV-2 (RED→GREEN) DTOs + Controller:** spec del controller primero. `create-product-variant.dto.ts`: `name @IsString @IsNotEmpty`, `description @IsString`, `reorderPoint @IsInt @Min(0)`, `productId @IsInt`; update con `PartialType`. Controller `@ApiTags('variants')` con `GET/POST/GET :id/PATCH/DELETE`, guards + `@Roles`.
  - **Edge cases**: `reorderPoint` negativo → `400`; `reorderPoint: 0` es **válido** (no confundir con vacío); `name` vacío → `400`; campo desconocido en el body se descarta (`whitelist`); petición sin token → `401`; rol insuficiente → `403`.
  → **Verificar**: `GET /variants` 200 en Swagger `/api`; body inválido 400.
- [ ] **PV-3 Module:** `TypeOrmModule.forFeature([ProductVariant, Product])`; exportar `ProductVariantsService`. → **Verificar**: `npm run start:dev` arranca sin error de inyección.
- [ ] **PV-4 Cobertura + e2e:** completar ramas faltantes y un e2e del CRUD. → **Verificar**: `npm run test:cov` ≥ 70% en `src/product-variants`.

### Stock (4)

- [ ] **ST-1 (RED→GREEN) Service — núcleo de negocio:** spec primero en `stocks.service.spec.ts`, luego implementar en `src/stocks/stocks.service.ts`:
  - CRUD básico (`create/findAll/findOne/update/remove`).
  - `getAvailable(stockId)` = `quantity − Σ(reservas activas)`.
  - `getAvailableByVariantWarehouse(variantId, warehouseId?)` = suma sobre los stocks de los SKUs de la variante (si no se pasa bodega, agrega todas).
  - **Edge cases (los importantes de este módulo)**:
    - Stock **sin reservas** → disponible = `quantity`.
    - Reservas en estado no activo (`COMPLETADA`/`CANCELADA`) **no** descuentan.
    - **Sobre-reserva**: `Σ reservas > quantity` → el disponible se **clampa a 0**, nunca negativo (documentar la decisión; es el caso que rompe el cálculo ingenuo).
    - Reserva **expirada** (`toDate` en el pasado) → definir y testear: no descuenta.
    - Stock **soft-deleted** (`deletedAt`) no se cuenta en las agregaciones.
    - Variante **sin SKUs** o SKUs **sin stock** → disponible `0`, sin lanzar excepción.
    - `getAvailable` con id inexistente → `NotFoundException`.
    - Agregación sobre **múltiples SKUs y múltiples bodegas** → suma correcta; con `warehouseId` filtra solo esa bodega.
  → **Verificar**: `npm test stocks.service` verde, incluidos sobre-reserva y multi-SKU.
- [ ] **ST-2 (RED→GREEN) DTOs + Controller:** spec primero. `create-stock.dto.ts`: `quantity @IsInt @Min(0)`, `skuId @IsString`, `warehouseId @IsInt`; update con `PartialType`. Controller `@ApiTags('stocks')`: CRUD + `GET /stocks/:id/available` + `GET /stocks/available?variantId=&warehouseId=`.
  - **Edge cases**: `quantity` negativa → `400`; `variantId` no numérico → `400`; `available` de un stock inexistente → `404`; sin token → `401`.
  → **Verificar**: `GET /stocks/:id/available` devuelve el número esperado.
- [ ] **ST-3 Module:** `TypeOrmModule.forFeature([Stock, Reservation, Sku, Warehouse])`; **exportar `StocksService`** (lo consume Alert). Definir aquí `ACTIVE_RESERVATION_STATUSES`. → **Verificar**: arranque sin errores de dependencias.
- [ ] **ST-4 Cobertura + e2e:** e2e del flujo "crear stock → reservar → consultar disponible". → **Verificar**: `npm run test:cov` ≥ 70% en `src/stocks`, con la rama del descuento de reservas cubierta.

### Alert (4)

- [ ] **AL-1 (RED→GREEN) Service:** spec primero. Implementar con `Repository<Alert>` + `StocksService`:
  - `findAll()` / `findOne(id)` (solo lectura).
  - `evaluateAndGenerate(variantId)`: si el disponible total de la variante `<= reorderPoint`, crea `Alert` describiendo la brecha y la enlaza a la variante.
  - **Edge cases**:
    - Disponible **exactamente igual** a `reorderPoint` → **sí** genera (frontera `<=`, decidida explícitamente y documentada).
    - Disponible por encima del punto → **no** genera nada.
    - **No duplicar**: si ya existe una alerta reciente para esa variante, no crear otra.
    - `reorderPoint = 0` → solo alerta cuando el disponible llega a `0`.
    - Variante **sin stock alguno** → disponible `0` → genera alerta (no debe romper por lista vacía).
    - Variante **inactiva** (`active: false`) → no genera.
    - Variante inexistente → `NotFoundException`.
  → **Verificar**: `npm test alerts.service` verde, incluidos frontera y no-duplicado.
- [ ] **AL-2 (RED→GREEN) Controller read-only:** dejar **solo** `GET /alerts` y `GET /alerts/:id`; eliminar POST/PATCH/DELETE del scaffold (el spec dice que las alertas se autogeneran). `@ApiTags('alerts')` + guards.
  - **Edge cases**: `GET /alerts/:id` inexistente → `404`; `POST /alerts` ya no existe → `404`; sin token → `401`.
  → **Verificar**: `GET /alerts` 200; `POST /alerts` 404.
- [ ] **AL-3 Module:** `TypeOrmModule.forFeature([Alert, ProductVariant])` + `imports: [StocksModule]`. → **Verificar**: `StocksService` se inyecta sin error de dependencia circular.
- [ ] **AL-4 Cobertura + e2e:** e2e "stock cae bajo reorderPoint → aparece en `GET /alerts`". → **Verificar**: `npm run test:cov` ≥ 70% en `src/alerts`.

### Documentación (1)

- [ ] **DOC-1 README.md:** actualizar `sistema-de-inventarios/README.md`: descripción, stack, requisitos, variables `.env` (ver `.env.example`), instalación/arranque (`npm install`, `npm run start:dev`), Swagger en `/api`, cómo correr tests y cobertura, tabla de módulos/endpoints, y nota de las reglas de negocio implementadas (disponible = existencias − reservas; alerta en `<= reorderPoint`). → **Verificar**: alguien nuevo levanta el proyecto siguiendo solo el README.

## Verificación global (fase final, siempre al último)

1. `npm run start:dev` — arranca sin errores de inyección/entidades.
2. Swagger `http://localhost:3000/api` — tags `variants`, `stocks`, `alerts` presentes; rutas protegidas exigen Bearer token.
3. Flujo manual/Postman: crear ProductVariant → `GET /stocks/available` → llevar el disponible bajo el `reorderPoint` → `GET /alerts` muestra la alerta.
4. `npm test` — suite completa de los 3 módulos en verde.
5. `npm run test:cov` — cobertura **≥ 70%** (rúbrica) en los módulos de Alex.

## Done When

- [ ] Los 3 módulos tienen Service/Controller/Module reales (sin mocks), DTOs validados y rutas protegidas por JWT+rol, visibles en Swagger.
- [ ] `getAvailable` descuenta reservas activas y **nunca devuelve negativo**; las alertas se generan en `disponible <= reorderPoint` sin duplicar.
- [ ] Cada módulo se construyó con TDD (spec en rojo antes de implementar) y todos los edge cases listados tienen su test.
- [ ] `npm test` verde y cobertura ≥ 70%.
- [ ] README actualizado.

## Decisiones pendientes con el equipo

- Estados de `Reservation` que cuentan como activos (costura #2) — hoy centralizados en `ACTIVE_RESERVATION_STATUSES`.
- Nombre del evento (`movement.created`) y ubicación del listener que dispara `AlertsService.evaluateAndGenerate` (costura #3).
- Confirmar que Movement (Armando) es el único que muta `Stock.quantity`, de forma transaccional.
