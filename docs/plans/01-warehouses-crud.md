# Plan 01 — Implementar CRUD completo de Warehouses

> Plan autocontenido para ejecutar con un LLM. Prerequisito: ninguno (independiente del Plan 00). Es prerequisito del Plan 02 (seeders) y 03 (colección Postman).

## Contexto del repo

- NestJS 11 + TypeORM 0.3 + Postgres (`synchronize: true` — el schema se deriva de las entities, sin migraciones).
- `ValidationPipe({ whitelist: true, transform: true })` global en `src/main.ts` — **un DTO sin propiedades decoradas descarta todo el body**. Ese es el estado actual de warehouses.
- Auth: JWT Bearer. Guards por método: `@Roles('ADMINISTRATOR')` + `@UseGuards(JwtAuthGuard, RolesGuard)` — **el orden importa** (JwtAuthGuard puebla `req.user`). Imports desde `src/jwt/jwt.guard`, `src/jwt/roles/roles.decorator`, `src/jwt/roles/roles.guard`.
- Roles: `ADMINISTRATOR`, `WAREHOUSE_MANAGER`, `ANALYST`.
- Convenciones (módulo de referencia: `src/categories/` — copia su estructura al detalle):
  - Imports absolutos `import { X } from 'src/...'`.
  - Soft delete por flag: `remove()` hace `entity.active = false` + `save()` (NO `softDelete()`).
  - Mensajes 404: `` `The warehouse with id #${id} could not be found` `` (formato del repo).
  - Updates: `Object.assign(entity, dto)` + `save`.
  - `findAll` acepta query `active` que el **controller** parsea a `true | false | undefined` (ver `src/categories/categories.controller.ts` líneas 35-37) antes de llamar al service.
  - Swagger es entregable calificado: cada campo de DTO con `@ApiProperty({example, description})`; cada endpoint con `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation`, `@ApiParam`/`@ApiQuery`, `@ApiResponse` incluyendo 401/403/404/409.
- Estado actual del módulo (`src/warehouses/`):
  - `warehouses.service.ts`: stub de `nest g resource` (retorna strings placeholder).
  - `dto/create-warehouse.dto.ts`: **clase vacía**. `dto/update-warehouse.dto.ts`: `PartialType` de la vacía.
  - `warehouses.controller.ts`: CRUD sin guards ni Swagger.
  - `warehouses.module.ts`: ya registra `TypeOrmModule.forFeature([Warehouse, Employee, Stock])` — no tocar.
  - Entity `src/warehouses/entities/warehouse.entity.ts` (no modificar): `id`, `name`, `maximumCapacity: int`, `availableCapacity: int`, `active` (default true), timestamps, `administrator: Employee` (OneToOne con `@JoinColumn`), `stocks: Stock[]`.
- `Warehouse` ya está en el array global `entities` de `src/app.module.ts` — sin cambios ahí.
- Semántica de capacidad usada por el resto del sistema (NO romperla): `availableCapacity` la descuentan/liberan las estrategias de movimientos (`src/strategies/`). El CRUD solo la inicializa y la ajusta al cambiar `maximumCapacity`.

## Cambios

### 1. `src/warehouses/dto/create-warehouse.dto.ts`

- `name: string` — `@IsString() @IsNotEmpty() @MinLength(2)`
- `maximumCapacity: number` — `@IsInt() @IsPositive()`
- `administratorId?: number` — `@IsOptional() @IsInt() @IsPositive()` (el "responsable" que pide la rúbrica)
- Todos con `@ApiProperty({example, description})` (el opcional con `required: false`).

### 2. `src/warehouses/dto/update-warehouse.dto.ts`

`PartialType(CreateWarehouseDto)` + campo extra `active?: boolean` (`@IsOptional() @IsBoolean()`), igual que hace `UpdateEmployeeDto` en `src/employees/dto/`.

### 3. `src/warehouses/warehouses.service.ts`

Constructor: `@InjectRepository(Warehouse)` y `@InjectRepository(Employee)` (entities ya en el forFeature del módulo). Métodos:

- **`create(dto)`**:
  - Nombre único: si existe warehouse con ese `name` → `ConflictException('Warehouse name already exists')` (409).
  - `availableCapacity = maximumCapacity` al crear (bodega nueva vacía).
  - Si viene `administratorId`: empleado debe existir (404 `` `The employee with id #${id} could not be found` ``), tener rol `WAREHOUSE_MANAGER` o `ADMINISTRATOR` (400 `BadRequestException` si es ANALYST), y **no administrar ya otra bodega activa** (409 — la relación es OneToOne; busca warehouse activa cuyo `administrator.id` sea ese empleado).
- **`findAll(active?: boolean)`**: filtro igual que categories; `relations: { administrator: true }`. (El password del empleado tiene `select: false` en la entity, no se filtra.)
- **`findOne(id)`**: 404 con el mensaje del formato del repo; `relations: { administrator: true, stocks: true }`.
- **`update(id, dto)`**:
  - 404 si no existe.
  - Si cambia `maximumCapacity`: `availableCapacity += (nuevoMax − viejoMax)`; si el resultado quedaría `< 0` → 400 `BadRequestException` (la capacidad ya está ocupada por stock físico).
  - Si cambia `administratorId`: mismas validaciones que en create.
  - Resto por `Object.assign` + `save`. Validar conflicto de nombre si viene `name` (como categories).
- **`remove(id)`**: 404 si no existe; si tiene stocks activos con `quantity > 0` → `ConflictException('Cannot deactivate warehouse with stock on hand')` (409); si no, `active = false` + `save`.

### 4. `src/warehouses/warehouses.controller.ts`

Replicar `src/categories/categories.controller.ts`:

- `POST /warehouses`, `PATCH /warehouses/:id`, `DELETE /warehouses/:id` → `@Roles('ADMINISTRATOR')` + `@UseGuards(JwtAuthGuard, RolesGuard)`.
- `GET /warehouses` (con `@Query('active')` parseado en el controller) y `GET /warehouses/:id` → solo `@UseGuards(JwtAuthGuard)`.
- Swagger completo en clase y métodos (`@ApiTags('warehouses')`, `@ApiBearerAuth()`, etc., con responses 200/201, 400, 401, 403, 404, 409 donde apliquen).
- Mantener PATCH (no PUT) — es la convención de este módulo generado.

### 5. Specs

`warehouses.service.spec.ts` y `warehouses.controller.spec.ts` son placeholders de `nest g` — reescribirlos con el estilo de specs del repo (mock repositories vía `getRepositoryToken`, mirar `src/categories/*.spec.ts` o `src/stocks/*.spec.ts` como referencia). Cobertura mínima:

- create feliz (availableCapacity == maximumCapacity) · nombre duplicado → 409 · administratorId inexistente → 404 · administrator con rol ANALYST → 400 · administrator ya asignado a otra bodega → 409
- update que sube maximumCapacity ajusta availableCapacity · update que la baja por debajo de lo ocupado → 400
- remove con stock en mano → 409 · remove feliz deja `active = false`
- controller: delega al service y parsea `active` correctamente

## Fuera de alcance

No tocar: entity, module, `app.module.ts`, estrategias de movimientos, otros módulos. No añadir validación de ownership por bodega en los guards (no existe en el repo y no es parte de este plan).

## Definition of Done

- `POST/GET/PATCH/DELETE /warehouses` funcionan contra la API real con los guards descritos y aparecen documentados en Swagger (`/api`).
- `npm run build`, `npm run lint`, `npm test` en verde (incluye `npm test -- warehouses`).

## Commit

```
Feat: implement warehouses CRUD
```
