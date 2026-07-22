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
   - **Dato de Nehemías (dueño de `Lot`, 2026-07-21)**: `Lot.state` tiene 3 valores — `PENDING` (lote registrado, aún no disponible), `RECEIVED` (lote llegó físicamente; desde aquí ya se pueden reclamar SKUs y registrar entradas a stock), `CLOSED` (todos los SKUs del lote ya fueron procesados, no acepta más movimientos). El gate para `MovementService.createEntry` es `Lot.state === 'RECEIVED'`. No confundir con `ACTIVE_RESERVATION_STATUSES` (`src/stocks/constants.ts`) — es un campo distinto (`Reservation.status`, no `Lot.state`).
2. **`Reservation.status`**: módulo sin asignar. Alex **lee** `Reservation` vía repositorio. **Resuelto (2026-07-21, confirmado por Alex con el equipo)**: los estados reales son `ACTIVE`, `COMPLETED`, `CANCELLED`. Solo `ACTIVE` descuenta del disponible. `ACTIVE_RESERVATION_STATUSES = ['ACTIVE']` en `src/stocks/constants.ts` (reemplazó el valor provisional `['PENDING', 'ACTIVA']` usado antes de esta confirmación).
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

- [x] **Tarea 0 — Prerrequisito transversal:** añadir `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` en `src/main.ts`. Sin esto los `class-validator` de los DTOs no corren y los tests de validación (400) fallan. → **Verificar**: POST con body inválido devuelve `400`. *(Si Armando ya lo agregó, omitir.)*
  - Hecho en `src/main.ts`. También se añadieron los tags `variants`/`stocks`/`alerts` al `DocumentBuilder` de Swagger.
  - **Infra adicional necesaria y no listada originalmente**: Jest no resolvía los imports absolutos `src/...` que usan las entidades (`rootDir` de Jest ya es `src`, así que `src/foo` no mapeaba a nada). Se agregó `moduleNameMapper: { "^src/(.*)$": "<rootDir>/$1" }` en el bloque `jest` de `package.json`. Sin esto, cualquier spec que importe una entidad con relaciones falla en el require, no en una aserción.

### Product Variant (4)

- [x] **PV-1 (RED→GREEN) Service:** escribir primero `product-variants.service.spec.ts`, luego implementar `create/findAll/findOne/update/remove` con `Repository<ProductVariant>`; `remove` = `softDelete`.
  - Casos base: create, findAll, findOne, update parcial, soft remove.
  - **Edge cases**: `findOne` con id inexistente → `NotFoundException`; `update` parcial **no** debe sobrescribir campos no enviados (p.ej. mandar solo `name` conserva `reorderPoint`); registros soft-deleted **no** aparecen en `findAll`; `remove` sobre uno ya eliminado → `NotFoundException`.
  → **Verificar**: `npm test product-variants.service` verde. ✅ 9/9 tests.
- [x] **PV-2 (RED→GREEN) DTOs + Controller:** spec del controller primero. `create-product-variant.dto.ts`: `name @IsString @IsNotEmpty`, `description @IsString`, `reorderPoint @IsInt @Min(0)`, `productId @IsInt`; update con `PartialType`. Controller `@ApiTags('variants')` con `GET/POST/GET :id/PATCH/DELETE`, guards + `@Roles`.
  - **Edge cases**: `reorderPoint` negativo → `400`; `reorderPoint: 0` es **válido** (no confundir con vacío); `name` vacío → `400`; campo desconocido en el body se descarta (`whitelist`); petición sin token → `401`; rol insuficiente → `403`.
  → **Verificar**: `GET /variants` 200 en Swagger `/api`; body inválido 400.
  - Nota de implementación: `productId` del DTO se mapea en el service a `product: { id: productId }` antes de `repository.create()` — TypeORM no persiste la relación si se le pasa `productId` como campo plano suelto (la entidad solo declara la propiedad de relación `product`, no una columna escalar `productId`).
- [x] **PV-3 Module:** `TypeOrmModule.forFeature([ProductVariant, Product])`; exportar `ProductVariantsService`. → **Verificar**: `npm run start:dev` arranca sin error de inyección (no probado contra Postgres real en este entorno, ver nota de e2e más abajo; sí verificado con `npm run build`).
- [x] **PV-4 Cobertura + e2e:** completar ramas faltantes. → **Verificar**: `npm run test:cov` ≥ 70% en `src/product-variants`. ✅ 85% líneas / 83% ramas. **e2e no ejecutado**: requiere PostgreSQL real accesible por `.env`, no disponible en este entorno de desarrollo; queda pendiente correrlo donde sí haya DB (ver sección de e2e global).

### Stock (4)

- [x] **ST-1 (RED→GREEN) Service — núcleo de negocio:** spec primero en `stocks.service.spec.ts`, luego implementar en `src/stocks/stocks.service.ts`:
  - Lectura/escritura acotada (`findAll/findOne/update/remove`) — **sin `create`**, ver ST-2 para el porqué.
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
  → **Verificar**: `npm test stocks.service` verde, incluidos sobre-reserva y multi-SKU. ✅ 16/16 tests.
- [x] **ST-2 (RED→GREEN) DTOs + Controller:** spec primero. **Sin `POST /stocks`** — decisión de equipo (2026-07-21): crear Stock no tiene caso de uso propio, lo cubre `MovementService` (entrada crea la fila). `create-stock.dto.ts` se elimina (o queda sin usar, sin endpoint que lo consuma). `update-stock.dto.ts` con `PartialType` se mantiene para PATCH. Controller `@ApiTags('stocks')`: `GET /stocks`, `GET /stocks/:id`, `PATCH /stocks/:id`, `DELETE /stocks/:id`, `GET /stocks/:id/available`, `GET /stocks/available?variantId=&warehouseId=`.
  - **`DELETE /stocks/:id` se mantiene** — no para "deshacer" un alta normal, sino para baja excepcional de una fila de Stock completa (producto contaminado, siniestro en bodega, daño imputable a personal). Soft delete (`active = false`), igual que el resto del repo. Documentar en Swagger (`@ApiOperation`) que es un caso de uso extraordinario, no el flujo de salida normal (eso es `MovementService.createExit`).
  - **Edge cases**: `quantity` negativa en PATCH → `400`; `variantId` no numérico → `400`; `available` de un stock inexistente → `404`; sin token → `401`; `POST /stocks` → `404` (ruta no existe).
  → **Verificar**: `GET /stocks/:id/available` devuelve el número esperado; `POST /stocks` da `404` (no existe el handler, Nest responde 404 nativo). Query params `variantId`/`warehouseId` de `GET /stocks/available` se validan con un `GetAvailableQueryDto` (`@Type(() => Number) @IsInt`), así que un `variantId` no numérico da `400` vía el `ValidationPipe` global (Tarea 0), sin parseo manual en el controller.
- [x] **ST-3 Module:** `TypeOrmModule.forFeature([Stock, Reservation, Sku, Warehouse])`; **exportar `StocksService`** (lo consume Alert). Definir aquí `ACTIVE_RESERVATION_STATUSES`. → **Verificar**: arranque sin errores de dependencias (`npm run build` limpio). Se quitó `Movement` del `forFeature` del módulo: `StocksService` no lo usa. `ACTIVE_RESERVATION_STATUSES` quedó en `src/stocks/constants.ts` = `['ACTIVE']` (valor real confirmado, ver sección de decisiones).
- [x] **ST-4 Cobertura:** completar ramas faltantes. → **Verificar**: `npm run test:cov` ≥ 70% en `src/stocks`. ✅ 88% líneas / 81% ramas. **e2e no ejecutado** (mismo motivo que PV-4: sin PostgreSQL en este entorno).

### Alert (4)

- [x] **AL-1 (RED→GREEN) Service:** spec primero. Implementar con `Repository<Alert>` + `StocksService`:
  - `findAll()` / `findOne(id)` (solo lectura).
  - `evaluateAndGenerate(variantId)`: si el disponible total de la variante `<= reorderPoint`, crea `Alert` describiendo la brecha y la enlaza a la variante.
  - **Edge cases**:
    - Disponible **exactamente igual** a `reorderPoint` → **sí** genera (frontera `<=`, decidida explícitamente y documentada).
    - Disponible por encima del punto → **no** genera nada.
    - **No duplicar**: si ya existe una alerta reciente para esa variante, no crear otra. **Decisión tomada**: "reciente" = una alerta ya creada para esa variante en las últimas 24h (`ALERT_DEDUPE_WINDOW_MS` en `alerts.service.ts`). La entidad `Alert` no tiene campo de estado/resuelto, así que se optó por una ventana de tiempo en vez de un flag; pasado ese tiempo con el disponible aún bajo el punto de reorden, se genera una nueva alerta.
    - `reorderPoint = 0` → solo alerta cuando el disponible llega a `0`.
    - Variante **sin stock alguno** → disponible `0` → genera alerta (no debe romper por lista vacía).
    - Variante **inactiva** (`active: false`) → no genera.
    - Variante inexistente → `NotFoundException`.
  → **Verificar**: `npm test alerts.service` verde, incluidos frontera y no-duplicado. ✅ 12/12 tests.
- [x] **AL-2 (RED→GREEN) Controller read-only:** dejar **solo** `GET /alerts` y `GET /alerts/:id`; eliminar POST/PATCH/DELETE del scaffold (el spec dice que las alertas se autogeneran). `@ApiTags('alerts')` + guards.
  - **Edge cases**: `GET /alerts/:id` inexistente → `404`; `POST /alerts` ya no existe → `404`; sin token → `401`.
  → **Verificar**: `GET /alerts` 200; `POST /alerts` 404. Se eliminaron `create-alert.dto.ts` y `update-alert.dto.ts` (sin endpoint que los use).
- [x] **AL-3 Module:** `TypeOrmModule.forFeature([Alert, ProductVariant])` + `imports: [StocksModule]`. → **Verificar**: `StocksService` se inyecta sin error de dependencia circular. Confirmado: `StocksModule` no importa `AlertsModule`, así que no hay ciclo.
- [x] **AL-4 Cobertura:** completar ramas faltantes. → **Verificar**: `npm run test:cov` ≥ 70% en `src/alerts`. ✅ 81% líneas / 82% ramas. **e2e no ejecutado** (mismo motivo, sin PostgreSQL en este entorno).

### Documentación (1)

- [x] **DOC-1 README.md:** actualizar `sistema-de-inventarios/README.md`: descripción, stack, requisitos, variables `.env` (ver `.env.example`), instalación/arranque (`npm install`, `npm run start:dev`), Swagger en `/api`, cómo correr tests y cobertura, tabla de módulos/endpoints, y nota de las reglas de negocio implementadas (disponible = existencias − reservas; alerta en `<= reorderPoint`). → **Verificar**: alguien nuevo levanta el proyecto siguiendo solo el README.

## Verificación global (fase final, siempre al último)

1. `npm run start:dev` — arranca sin errores de inyección/entidades. **No verificado en este entorno**: no hay PostgreSQL disponible aquí; sí se verificó `npm run build` (compila limpio, `tsc` sobre el código de producción sin errores en los 3 módulos).
2. Swagger `http://localhost:3000/api` — tags `variants`, `stocks`, `alerts` presentes; rutas protegidas exigen Bearer token. Tags agregados en `src/main.ts`; **no verificado visualmente** (requiere servidor corriendo con DB).
3. Flujo manual/Postman: crear ProductVariant → `GET /stocks/available` → llevar el disponible bajo el `reorderPoint` → `GET /alerts` muestra la alerta. **Pendiente** — depende de 1.
4. `npm test` — suite completa de los 3 módulos en verde. ✅ `product-variants`, `stocks`, `alerts`: 6 suites / 56 tests, todos verdes. (El resto del repo tiene 6 suites rotas preexistentes fuera del alcance de Alex: `categories.*.spec.ts`, `auth.*.spec.ts`, `jwt.guard.spec.ts`, `app.controller.spec.ts` — no se tocaron.)
5. `npm run test:cov` — cobertura **≥ 70%** (rúbrica) en los módulos de Alex. ✅ `product-variants` 85%, `stocks` 88%, `alerts` 81% (líneas).

**Pendiente real para el equipo**: correr `npm run start:dev`, Swagger y el flujo manual (puntos 1–3) contra una base PostgreSQL real, y `npm run test:e2e` — ninguno se pudo ejecutar en este entorno de desarrollo por falta de una instancia de PostgreSQL accesible.

## Done When

- [x] Los 3 módulos tienen Service/Controller/Module reales (sin mocks), DTOs validados y rutas protegidas por JWT+rol, visibles en Swagger (tags agregados).
- [x] `getAvailable` descuenta reservas activas y **nunca devuelve negativo**; las alertas se generan en `disponible <= reorderPoint` sin duplicar.
- [x] Cada módulo se construyó con TDD (spec en rojo antes de implementar) y todos los edge cases listados tienen su test.
- [x] `npm test` verde (en los 3 módulos de Alex) y cobertura ≥ 70%.
- [x] README actualizado.
- [ ] Verificación contra PostgreSQL real (arranque, Swagger, flujo manual, e2e) — pendiente, ver arriba.

## Decisiones tomadas / pendientes con el equipo

- **Estados de `Reservation` activos (costura #2)** — **resuelto** (2026-07-21, Alex confirmó con el equipo): valores reales `ACTIVE`, `COMPLETED`, `CANCELLED`. Solo `ACTIVE` cuenta como reserva activa. `ACTIVE_RESERVATION_STATUSES = ['ACTIVE']` en `src/stocks/constants.ts`, reemplazando el valor provisional `['PENDING', 'ACTIVA']` usado antes de la confirmación.
- **Ventana de no-duplicado de alertas** — decisión tomada: 24h desde la última alerta de esa variante (`ALERT_DEDUPE_WINDOW_MS` en `alerts.service.ts`), ante la ausencia de un campo de estado en `Alert`.
- **Nombre del evento (`movement.created`) y ubicación del listener** que dispara `AlertsService.evaluateAndGenerate` (costura #3) — sigue sin resolver con Armando; `evaluateAndGenerate` quedó público e invocable manualmente, sin listener todavía.
- **Confirmar que Movement (Armando) es el único que muta `Stock.quantity`**, de forma transaccional — sigue pendiente de confirmar con el equipo.
