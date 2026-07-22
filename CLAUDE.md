# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout note

The git repository root is `sistema-de-inventarios/`, not its parent folder (`API multi-bodega/`, which only holds the course rubric PDF). All commands below run from `sistema-de-inventarios/`.

## Commands

```bash
npm install
npm run start:dev          # watch mode (Swagger UI at http://localhost:$PORT/api)
npm run build              # nest build -> dist/
npm run start:prod         # node dist/main

npm test                   # jest, rootDir=src, testRegex .*\.spec\.ts$
npm test -- categories     # run specs whose path matches "categories"
npm test -- -t "should be defined"   # run by test name
npm run test:cov
npm run test:e2e           # jest --config ./test/jest-e2e.json (test/ dir)

npm run lint               # eslint --fix over src, apps, libs, test
npm run format             # prettier --write
```

## Environment

`.env` is loaded by the bare `import 'dotenv/config'` statements in `src/app.module.ts` and `src/jwt/jwt.strategy.ts` — there is no `@nestjs/config` module. `dotenv` itself is only present transitively (via `typeorm`), so it is not in `package.json`.

`.env.example` is incomplete: besides `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME/PORT`, the code also requires **`SECRET_KEY`** (JWT signing/verification, `auth.module.ts` and `jwt.strategy.ts`). Both fall back to `''` when unset, which silently produces unverifiable tokens.

Postgres with `synchronize: true` — schema is derived from the entities on every boot. There are no migrations; changing an entity changes the DB.

## Architecture

NestJS 11 + TypeORM 0.3 + Swagger, one `nest g resource` module per domain entity under `src/<entity>/` (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/`).

Entities are registered **twice**: in the global `entities: [...]` array of `TypeOrmModule.forRoot` in `src/app.module.ts`, and per-module via `TypeOrmModule.forFeature([...])`. A module's `forFeature` list includes every entity its service touches, not just its own (e.g. `StocksModule` registers `Stock, Sku, Warehouse, Reservation, Movement`). Adding an entity means editing both places.

Domain model (see `Context.md` for the authoritative field-level spec, `docs/diagrama de BD.jpeg` for the ERD):
Category → Product → ProductVariant → Sku (Sku also belongs to a Lot, which belongs to a Provider). A `Stock` is a Sku physically held in a `Warehouse`; `Reservation` and `Movement` both hang off Stock (Movement has nullable `destinationStock` for ENTRY/EXIT vs TRANSFER, and an optional link to the Reservation it fulfils). `Employee` manages one Warehouse.

`docs/Spec Plan - ...md` and `docs/Sistema de inventario multi-bodega - Servicios, Entidades y Endpoints.md` describe the intended end state and use the older name **Inventory** for what is now the **Stock** entity. Not yet built: `MovementService` (`createEntry`/`createExit`/`createTransfer`/`revertMovement`), FIFO cost calculation, the Analytics module, and the `movement.created` event listener.

### Auth and authorization

`POST /auth/login` (`src/auth/`) validates an Employee with bcrypt and returns a JWT whose payload is `{ sub, email, roles }` — `roles` is the single `employee.role` **string**, not an array.

Protection is applied per-controller-method, not globally:

```ts
@Roles('ADMINISTRATOR')
@UseGuards(JwtAuthGuard, RolesGuard)   // order matters: JwtAuthGuard populates req.user
```

- `src/jwt/jwt.guard.ts` — `JwtAuthGuard extends AuthGuard('jwt')`
- `src/jwt/jwt.strategy.ts` — maps the payload to `{ employeeId, email, roles }` on `req.user`
- `src/jwt/roles/roles.decorator.ts` / `roles.guard.ts` — `RolesGuard` passes when no `@Roles` metadata is present, so `@Roles` without `@UseGuards(RolesGuard)` enforces nothing

Roles (`Context.md`): `ADMINISTRATOR` (everything), `WAREHOUSE_MANAGER` (writes limited to movements/reservations of their own warehouse; reads everywhere), `ANALYST` (analytics + reads only). The per-warehouse ownership check does not exist yet — `RolesGuard` only compares role names.

### Conventions

`src/categories/` is the only fully implemented module and is the reference for new work. Every other service still returns the `nest g resource` placeholder strings.

- Absolute imports rooted at the project (`import { X } from 'src/foo/...'`), enabled by `baseUrl: "./"` — used in most files, though a few entities use relative paths.
- **Soft delete by flag**: `remove()` sets `active = false` and saves; it does not call `repository.softDelete()`. Entities carry both an `active` boolean and TypeORM `@DeleteDateColumn` — only `active` is used.
- Every entity field carries `@ApiProperty({ example, description })`, and every controller method carries `@ApiTags`/`@ApiBearerAuth`/`@ApiOperation`/`@ApiResponse` (including the 401/403 cases) — Swagger docs are a graded deliverable.
- `findAll` takes an optional `active` query string that the *controller* parses into `true | false | undefined` before calling the service (see `categories.controller.ts:35`).
- Services throw `NotFoundException` with a message like `` `The category with id #${id} could not be found` ``.
- Updates are `Object.assign(entity, dto)` then `repository.save(...)`.

### Known gaps to be aware of before extending

- No global `ValidationPipe` in `src/main.ts` and **no `class-validator` decorators in any DTO** — `class-validator`/`class-transformer` are installed but unused, so request bodies are currently unvalidated.
- `Employee.password` is `@Column({ select: false })`, but `AuthService.validateEmployee` uses a plain `findOne` — the password is not selected, so `bcrypt.compare` receives `undefined`. A login flow that works needs `addSelect`/`select` on that query.
- Nothing hashes passwords on employee creation yet (`EmployeesService` is still scaffolding).
- `better-sqlite3`, `pdfkit` and `passport-google-oauth20` are installed but not wired up anywhere.
