# Implementation Plan: Movements Module — TDD + Swagger Completion

> **Reference Spec:** [`specs/movements-plan-spec.md`](../specs/movements-plan-spec.md)
> **Target Directories:** `src/movements/**`, `src/strategies/**`, `src/factories/**`, `src/validations/**`, `test/movements.e2e-spec.ts`

---

## Background & Context

The `Movements` module is the most complex domain in this inventory system. It manages six distinct movement types (entrance, issue, transfer, transfer-from-reservation, issue-from-reservation, receive-transfer) coordinated through a Strategy pattern, a Chain-of-Responsibility validation layer, and two support services (`MovementEntityResolverService`, `StockAllocationService`).

Current state gaps addressed by this plan:

1. **Unit test stubs** — `movements.controller.spec.ts` and `movements.service.spec.ts` contain only a `toBeDefined()` check each. All layer-specific specs are missing.
2. **Missing DTO decorators** — Six of seven movement DTOs have no `class-validator` or `ApiProperty` decorators; `IssueFromReservationDto` is partially annotated.
3. **Missing Swagger controller annotations** — No `ApiOperation`, `ApiCreatedResponse`, `ApiOkResponse`, or error response decorators on any endpoint.
4. **Unawaited validator chain** — Every strategy's `validate()` helper calls `validator?.handle(context)` without `await`, meaning async validators are silently skipped.
5. **Missing `ReceiveDecision` enum** — `ReceiveTransferDto.decision` is an unvalidated string literal union with no enum or class-validator guard.
6. **`@Param('id')` type coercion** — `MovementsController.findOne` receives `id` as a string without a number parser.
7. **No E2E coverage** — `test/movements.e2e-spec.ts` does not exist.

> **IMPORTANT — TDD Discipline:** Every production code change must be preceded by at least one *failing* test that targets the exact behavior being introduced or fixed. The Red → Green → Refactor cycle must be explicit in each phase below. Do NOT write production code before its corresponding failing test exists.

---

## Assumptions

1. The `sku.quantity` decrement in `EntranceMovementStrategy` (`sku.quantity - dto.quantity`) is **intentional**: `Sku.quantity` represents how many lot units are still uncommitted for warehousing; once they enter a warehouse stock they are "consumed" from the lot.
2. The `await` gap in all strategy `validate()` helpers is a bug. All validator `handle()` calls must be awaited.
3. `ReceiveTransferDto.decision` must use a new `ReceiveDecision` enum (`ACCEPT | REJECT`) stored in `src/enums/movement-type.enum.ts`.
4. E2E tests use the real test database configured via `.env.testing`, following the same seed/cleanup pattern as `auth.e2e-spec.ts` and `categories.e2e-spec.ts`.
5. `@Param('id')` in `MovementsController.findOne` should be coerced to `number` using the `+id` unary operator inside the method body (not `ParseIntPipe`).

---

## Phase 1 — DTO Swagger + Validation Baseline

**Goal:** All seven movement DTOs are fully decorated with `@ApiProperty` / `@ApiPropertyOptional` and class-validator rules.

> Write failing tests (integration or unit DTO-pipe tests) first, then add decorators.

---

### 1.1 Red — Write Failing DTO Pipe Tests

Create `src/movements/dto/movements-dto.spec.ts` (new file). Use `plainToInstance` + `validate` from `class-transformer` / `class-validator` to assert that:

- Submitting an empty object `{}` to each DTO produces at least one validation error.
- Submitting a valid payload produces zero validation errors.
- Submitting invalid field types (e.g., string for a numeric field) produces an error.

These tests will all **fail** initially because no decorators are present.

---

### 1.2 Green — Add Decorators to Each DTO

#### [MODIFY] `src/movements/dto/create-entry.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateEntryDto {
  @ApiProperty({ example: 10, description: 'Number of units to enter into stock' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'SKU-001', description: 'SKU identifier of the lot being entered' })
  @IsString()
  @IsNotEmpty()
  skuId: string;

  @ApiProperty({ example: 1, description: 'ID of the destination warehouse' })
  @Type(() => Number)
  @IsInt()
  warehouseId: number;

  @ApiProperty({ example: 2, description: 'ID of the employee performing the entry' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;
}
```

#### [MODIFY] `src/movements/dto/create-issue.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class CreateIssueDto {
  @ApiProperty({ example: 5, description: 'Number of units to issue from stock' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 3, description: 'ID of the product variant to issue' })
  @Type(() => Number)
  @IsInt()
  productVariantId: number;

  @ApiProperty({ example: 1, description: 'ID of the source warehouse' })
  @Type(() => Number)
  @IsInt()
  warehouseId: number;

  @ApiProperty({ example: 2, description: 'ID of the employee performing the issue' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;
}
```

#### [MODIFY] `src/movements/dto/transfer-movement.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';

export class TransferMovementDto {
  @ApiProperty({ example: 8, description: 'Number of units to transfer' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 3, description: 'ID of the product variant to transfer' })
  @Type(() => Number)
  @IsInt()
  productVariantId: number;

  @ApiProperty({ example: 1, description: 'ID of the origin warehouse' })
  @Type(() => Number)
  @IsInt()
  originWarehouseId: number;

  @ApiProperty({ example: 2, description: 'ID of the destination warehouse' })
  @Type(() => Number)
  @IsInt()
  destinationWarehouseId: number;

  @ApiProperty({ example: 4, description: 'ID of the employee performing the transfer' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;
}
```

#### [MODIFY] `src/movements/dto/transfer-from-reservation.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class TransferFromReservationDto {
  @ApiProperty({ example: 2, description: 'ID of the employee initiating the transfer' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @ApiProperty({ example: 5, description: 'ID of the reservation backing this transfer' })
  @Type(() => Number)
  @IsInt()
  reservationId: number;

  @ApiProperty({ example: 3, description: 'ID of the destination warehouse' })
  @Type(() => Number)
  @IsInt()
  destinationWarehouseId: number;
}
```

#### [MODIFY] `src/movements/dto/issue-from-reservation.dto.ts`

Add the missing `@IsInt()` and `@ApiProperty()` to `reservationId`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class IssueFromReservationDto {
  @ApiProperty({ example: 1, description: 'Employee performing the issue' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @ApiProperty({ example: 1, description: 'Reservation to issue against' })
  @Type(() => Number)
  @IsInt()
  reservationId: number;
}
```

#### [MODIFY] `src/enums/movement-type.enum.ts`

Add the `ReceiveDecision` enum at the end of this file:

```typescript
export enum ReceiveDecision {
  ACCEPT = 'ACCEPT',
  REJECT = 'REJECT',
}
```

#### [MODIFY] `src/movements/dto/receive-transfer.dto.ts`

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsUUID } from 'class-validator';
import { ReceiveDecision } from 'src/enums/movement-type.enum';

export class ReceiveTransferDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID of the transfer group to receive' })
  @IsUUID()
  transferGroupId: string;

  @ApiProperty({ example: 2, description: 'ID of the employee receiving the transfer' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @ApiProperty({ enum: ReceiveDecision, description: 'Decision on the incoming transfer: ACCEPT or REJECT' })
  @IsEnum(ReceiveDecision)
  decision: ReceiveDecision;
}
```

#### [VERIFY] `src/movements/dto/find-movements.dto.ts`

This file is already well-annotated. Confirm `@Type(() => Number)` is present on `warehouseId` and `productVariantId` (it is). No structural changes needed — only verify in tests.

---

### 1.3 Refactor

- Remove any unused imports left in DTOs after adding decorators.
- Ensure all `@Type(() => Number)` decorators are placed **before** `@IsInt()` for proper transformation order.

---

## Phase 2 — Controller Swagger Response Completion

**Goal:** Every endpoint in `MovementsController` has `ApiOperation`, success, and error response decorators.

---

#### [MODIFY] `src/movements/movements.controller.ts`

Add the following imports at the top:

```typescript
import {
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { Movement } from './entities/movement.entity';
```

Apply decorators to each endpoint as follows:

| Endpoint | Success Decorator | Error Decorators |
|---|---|---|
| `POST /movements/entry` | `@ApiCreatedResponse({ type: Movement })` | `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse` |
| `POST /movements/issue` | `@ApiCreatedResponse({ type: Movement, isArray: true })` | same as above + `@ApiConflictResponse` |
| `POST /movements/issue-from-reservation` | `@ApiOkResponse({ type: Movement })` | `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse` |
| `POST /movements/transfer` | `@ApiCreatedResponse({ type: Movement, isArray: true })` | same as entry + `@ApiConflictResponse` |
| `POST /movements/transfer-from-reservation` | `@ApiOkResponse({ type: Movement })` | same as entry + `@ApiConflictResponse` |
| `POST /movements/receive-transfer` | `@ApiOkResponse({ type: Movement, isArray: true })` | `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse` |
| `GET /movements/:id` | `@ApiOkResponse({ type: Movement })` | `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse` |
| `GET /movements` | `@ApiOkResponse({ type: Movement, isArray: true })` | `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse` |

Also fix the `findOne` param coercion at this step:

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return this.movementsService.findOne(+id);
}
```

---

## Phase 3 — Controller & Service Unit Tests

**Goal:** Full unit test coverage for `MovementsController` and `MovementsService`.

---

### 3.1 Red — Write Failing Controller Tests

#### [MODIFY] `src/movements/movements.controller.spec.ts`

Replace the stub with a full suite. Use `jest.fn()` mocks for `MovementsService`. Test behaviors:

1. `createEntry` calls `movementsService.createEntry(dto)` and returns its result.
2. `createIssue` calls `movementsService.createIssue(dto)` and returns its result.
3. `createIssueFromReservation` calls `movementsService.createIssueFromTransfer(dto)`.
4. `createTransfer` calls `movementsService.createTransfer(dto)`.
5. `createTransferFromReservation` calls `movementsService.createTransferFromReservation(dto)`.
6. `receiveTransfer` calls `movementsService.receiveTransfer(dto)`.
7. `findOne` calls `movementsService.findOne(+id)` with a numeric id (verify `+id` coercion — pass `'5'` as string param, assert `findOne` was called with `5`).
8. `findAll` calls `movementsService.findAll(query)` and returns its result.

Example test structure:

```typescript
describe('MovementsController', () => {
  let controller: MovementsController;
  let service: jest.Mocked<MovementsService>;

  beforeEach(async () => {
    const mockService = {
      createEntry: jest.fn(),
      createIssue: jest.fn(),
      createIssueFromTransfer: jest.fn(),
      createTransfer: jest.fn(),
      createTransferFromReservation: jest.fn(),
      receiveTransfer: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [MovementsController],
      providers: [{ provide: MovementsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MovementsController>(MovementsController);
    service = module.get(MovementsService);
  });

  it('createEntry — delegates to movementsService.createEntry with DTO', async () => {
    const dto: CreateEntryDto = { quantity: 10, skuId: 'SKU-1', warehouseId: 1, employeeId: 2 };
    service.createEntry.mockResolvedValue({ id: 1 } as any);
    const result = await controller.createEntry(dto);
    expect(service.createEntry).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1 });
  });

  // ... repeat for all other endpoints
});
```

---

### 3.2 Red — Write Failing Service Tests

#### [MODIFY] `src/movements/movements.service.spec.ts`

Replace stub with full suite. Mock `MovementStrategyFactory`, `Repository<Movement>`, and `ReceiveTransferStrategy`.

**Tests to include:**

1. `createEntry` — calls `strategyFactory.make(MovementType.ENTRANCE)` then `.execute(dto)`.
2. `createIssue` — calls `strategyFactory.make(MovementType.ISSUE)` then `.execute(dto)`.
3. `createIssueFromTransfer` — calls `strategyFactory.make(MovementType.ISSUE_FROM_RESERVATION)` then `.execute(dto)`.
4. `createTransfer` — calls `strategyFactory.make(MovementType.TRANSFER)` then `.execute(dto)`.
5. `createTransferFromReservation` — calls `strategyFactory.make(MovementType.TRANSFER_FROM_RESERVATION)` then `.execute(dto)`.
6. `receiveTransfer` — calls `receiveTransferStrategy.execute(dto)` directly (NOT through factory).
7. `findOne — success` — `movementRepository.findOne` returns a movement; method returns it.
8. `findOne — NotFoundException` — `movementRepository.findOne` returns `null`; method throws `NotFoundException`.
9. `findAll — applies type filter` — when `query.type = MovementType.ENTRANCE`, `andWhere` is called with the correct args.
10. `findAll — applies status filter`.
11. `findAll — applies transferGroupId filter`.
12. `findAll — applies warehouseId filter`.
13. `findAll — applies productVariantId filter`.
14. `findAll — applies dateFrom filter`.
15. `findAll — applies dateTo filter`.
16. `findAll — with no query` — returns all movements without filters.

> **High-Risk:** Test #12 and all numeric filters. The current `if (query?.warehouseId)` guard would skip `warehouseId: 0` (falsy). Write a failing test for `findAll({ warehouseId: 0 })` asserting the filter IS applied, then fix the guard to `if (query?.warehouseId !== undefined)` if `0` is a valid ID.

---

### 3.3 Green

Run `npm run test -- --testPathPattern=movements.controller|movements.service`. Fix until green.

### 3.4 Refactor

Clean up mock setup helpers into a shared `beforeEach` factory if repetitive.

---

## Phase 4 — Factory & Validator Unit Tests

**Goal:** Full unit coverage for `MovementStrategyFactory`, `ValidationFactory`, and all 9 individual validators.

---

### 4.1 Red — Strategy Factory Tests

#### [NEW] `src/factories/movement-strategy.factory.spec.ts`

```typescript
describe('MovementStrategyFactory', () => {
  // For each MovementType value: factory.make(type) returns the correct strategy instance
  it('returns EntranceMovementStrategy for ENTRANCE')
  it('returns IssueMovementStrategy for ISSUE')
  it('returns TransferMovementStrategy for TRANSFER')
  it('returns TransferFromReservationStrategy for TRANSFER_FROM_RESERVATION')
  it('returns IssueFromReservationStrategy for ISSUE_FROM_RESERVATION')
  it('throws BadRequestException for an unknown movement type string')
});
```

Use `Test.createTestingModule` with all strategy mocks injected as `useValue: {}`.

---

### 4.2 Red — Validation Factory Tests

#### [NEW] `src/factories/validation.factory.spec.ts`

```typescript
describe('ValidationFactory', () => {
  it('returns LotAvailableValidator for "lot-availability"')
  it('returns SkuExistenceValidator for "sku-existence"')
  it('returns IsWarehouseManagerValidator for "warehouse-manager-permission"')
  it('returns WarehouseCapacityValidator for "warehouse-capacity"')
  it('returns ProductVariantExistenceValidator for "product-variant-existence"')
  it('returns ReservationExistenceValidator for "reservation-existence"')
  it('returns ReservationActiveStatusValidator for "reservation-active-status"')
  it('returns StockAvailabilityValidator for "stock-availability"')
  it('returns DestinationWarehouseCapacityValidator for "destination-warehouse-capacity"')
  it('throws BadRequestException for an unknown rule string')
});
```

---

### 4.3 Red — Validator Unit Tests

#### [NEW] `src/validations/lot-available.validator.spec.ts`

- **Pass:** `sku.lot.state === 'RECEIVED'` → calls `super.handle`, returns `true`.
- **Fail — missing sku:** `sku = undefined` → throws `BadRequestException('SKU was not found')`.
- **Fail — wrong state:** `sku.lot.state === 'PENDING'` → throws `BadRequestException` with lot ID.

#### [NEW] `src/validations/sku-existence.validator.spec.ts`

- **Pass:** `sku` present, `sku.quantity >= quantity`.
- **Fail — missing sku:** `sku = undefined` → throws `BadRequestException`.
- **Fail — insufficient:** `sku.quantity < quantity` → throws `BadRequestException`.

#### [NEW] `src/validations/is-warehouse-manager.validator.spec.ts`

Read `src/validations/is-warehouse-manager.validator.ts` before writing these tests to confirm the exact failure exception. Then test:
- **Pass:** employee has the required warehouse manager relationship with the warehouse.
- **Fail:** employee is not a manager of the warehouse → throws the appropriate exception.

#### [NEW] `src/validations/warehouse-capacity.validator.spec.ts`

- **Pass:** `warehouse.availableCapacity >= quantity`.
- **Fail:** `warehouse.availableCapacity < quantity` → throws `BadRequestException` with capacity details.

#### [NEW] `src/validations/product-variant-existence.validator.spec.ts`

Read `src/validations/product-variant-existence.validator.ts` before writing. Then test:
- **Pass:** `skus` array is non-empty AND `productVariantId` found.
- **Fail:** `skus` is empty → throws expected exception.

#### [NEW] `src/validations/reservation-existence.validator.spec.ts`

- **Pass:** `reservation` is defined.
- **Fail:** `reservation = undefined` → throws `NotFoundException`.

#### [NEW] `src/validations/reservation-status.validator.spec.ts`

- **Pass:** `reservation.status === 'ACTIVE'`.
- **Fail:** `reservation.status === 'COMPLETED'` → throws `BadRequestException`.

#### [NEW] `src/validations/stock-availability.validator.spec.ts`

- **Pass:** `stock` present, `stock.active === true`, `stock.quantity >= quantity`.
- **Fail — missing stock:** throws `NotFoundException('Stock was not found')`.
- **Fail — inactive:** throws `BadRequestException('The stock with id X is not active')`.
- **Fail — insufficient:** throws `BadRequestException` with quantity detail.

#### [NEW] `src/validations/destination-warehouse-capacity.validator.spec.ts`

Read `src/validations/destination-warehouse-capacity.validator.ts` before writing. Then test:
- **Pass:** `destinationWarehouse.availableCapacity >= quantity`.
- **Fail:** throws `BadRequestException` with capacity detail.

---

### 4.4 Green

Run `npm run test -- --testPathPattern=factories|validations`. Fix until green.

### 4.5 Refactor

Extract repeated context builder helpers (e.g., `buildContext(overrides)`) into a shared test utility if used in 3+ spec files.

---

## Phase 5 — Support Service Unit Tests

---

### 5.1 Red — MovementEntityResolverService Tests

#### [NEW] `src/movements/support/movement-entity-resolver.service.spec.ts`

Mock all injected repositories (`warehouseRepository`, `employeeRepository`, `productVariantRepository`, `reservationRepository`).

**`resolveWarehouseAndEmployee` tests:**
1. Returns `{ warehouse, employee }` when both exist.
2. Throws `NotFoundException` when warehouse not found.
3. Throws `NotFoundException` when employee not found.

**`resolveProductVariant` tests:**
4. Returns `ProductVariant` when found.
5. Throws `NotFoundException` when not found.

**`resolveWarehouseFromReservation` tests:**
6. Returns `{ reservation, warehouse, stock }` when all relations are present.
7. Throws `NotFoundException` when reservation not found.
8. Throws `NotFoundException` when `reservation.stock` is null.
9. Throws `NotFoundException` when `stock.warehouse` is null.

---

### 5.2 Red — StockAllocationService Tests

#### [NEW] `src/movements/support/stock-allocation.service.spec.ts`

Mock `stockRepository` and `reservationRepository`.

**`buildAllocationPlan` tests:**
1. Returns `{ allocations: [], remaining: quantityNeeded }` when `skus` array is empty.
2. Allocates from the first stock in FEFO order when one stock has enough.
3. Allocates across multiple stocks in FEFO order when one is insufficient alone.
4. Returns `remaining > 0` when total available < quantity needed (insufficient stock).
5. Subtracts active reservation quantity from available quantity before allocating.
6. Skips stocks with `available <= 0` after reservation deduction.

**`findOrCreateStock` tests:**
7. Returns existing stock when found by sku+warehouse.
8. Creates and saves a new stock with `quantity: 0, active: true` when not found.

---

### 5.3 Green

Run `npm run test -- --testPathPattern=support`. Fix until green.

---

## Phase 6 — Strategy Unit Tests

**Goal:** Behavioral unit tests for all six strategies. Each test isolates the strategy by mocking all repositories and support services.

> **IMPORTANT — Await Fix (Green for all strategies):** Every strategy's `validate()` private method currently calls `validator?.handle(context)` without `await`. Write a failing test that proves an async validator is skipped, then fix all six strategies by adding `await` to `validator?.handle(context)`.

---

### 6.1 Red → Green: EntranceMovementStrategy

#### [NEW] `src/strategies/entrance-movement.strategy.spec.ts`

Mock: `MovementEntityResolverService`, `skuRepository`, `warehouseRepository`, `stockRepository`, `movementRepository`.

**Tests:**
1. Throws `NotFoundException` when SKU not found by `skuId`.
2. Calls `resolver.resolveWarehouseAndEmployee` with correct `warehouseId` and `employeeId`.
3. Calls `validate()` chain — spy that `ValidationFactory.make` is called for each rule in `['lot-availability', 'sku-existence', 'warehouse-manager-permission', 'warehouse-capacity']`.
4. Creates a new stock record when none exists for the sku+warehouse pair.
5. Increments existing stock quantity when stock already exists.
6. Decrements `sku.quantity` by `dto.quantity` (SKU lot units move to stock) and saves.
7. Decrements `warehouse.availableCapacity` by `dto.quantity` and saves.
8. Creates a `Movement` with `type: ENTRANCE`, `status: 'COMPLETED'`, correct `totalCost`.
9. **Await-gap Red test:** mock a validator that rejects with an error; without await, the error is swallowed → after the fix with `await`, the strategy re-throws the error.

---

### 6.2 Red → Green: IssueMovementStrategy

#### [NEW] `src/strategies/issue-movement.strategy.spec.ts`

Mock: `MovementEntityResolverService`, `skuRepository`, `StockAllocationService`, `DataSource`.

**Tests:**
1. Fetches SKUs ordered by `bestBeforeDate ASC` (FEFO).
2. Calls `stockAllocation.buildAllocationPlan` with correct skus, warehouse, quantity.
3. Throws `BadRequestException` when `allocationPlan.remaining > 0`.
4. For each allocation: decrements `stock.quantity`, saves stock.
5. Creates one `Movement` per allocation with `type: ISSUE`, `status: COMPLETED`.
6. Increments `warehouse.availableCapacity` by total `dto.quantity` after issue.
7. All DB writes happen inside a transaction (`dataSource.transaction` is called).

---

### 6.3 Red → Green: TransferMovementStrategy

#### [NEW] `src/strategies/transfer-movement.strategy.spec.ts`

Mock: `MovementEntityResolverService`, `StockAllocationService`, `skuRepository`, `warehouseRepository`, `movementRepository`, `DataSource`.

**Tests:**
1. Throws `NotFoundException` when destination warehouse not found.
2. Calls allocation plan with FEFO-ordered SKUs.
3. Throws `BadRequestException` when remaining > 0 (insufficient origin stock).
4. Creates a `transferGroupId` (UUID) for all movements in the batch.
5. For each allocation: decrements `originStock.quantity`, calls `findOrCreateStock` for destination.
6. Creates movements with `status: IN_TRANSIT`, correct `transferGroupId`.
7. Decrements `destinationWarehouse.availableCapacity` by `dto.quantity`.
8. All writes are transactional.

---

### 6.4 Red → Green: TransferFromReservationStrategy

#### [NEW] `src/strategies/transfer-from-reservation.strategy.spec.ts`

Mock: `MovementEntityResolverService`, `StockAllocationService`, `employeeRepository`, `warehouseRepository`, `movementRepository`, `DataSource`.

**Tests:**
1. Throws `NotFoundException` when employee not found.
2. Calls `resolver.resolveWarehouseFromReservation` with `dto.reservationId`.
3. Throws `NotFoundException` when destination warehouse not found.
4. Uses `reservation.quantity` as the movement quantity.
5. Decrements `originStock.quantity` by reservation quantity.
6. Calls `findOrCreateStock` for destination.
7. Sets `reservation.status = 'COMPLETED'` and saves.
8. Decrements `destinationWarehouse.availableCapacity` by quantity.
9. Creates a single `Movement` with `type: TRANSFER`, `status: IN_TRANSIT`, `reservation` linked.
10. Operation is transactional.

---

### 6.5 Red → Green: IssueFromReservationStrategy

#### [NEW] `src/strategies/issue-from-reservation.strategy.spec.ts`

Mock: `MovementEntityResolverService`, `employeeRepository`, `movementRepository`, `DataSource`.

**Tests:**
1. Throws `NotFoundException` when employee not found.
2. Calls `resolver.resolveWarehouseFromReservation` with `dto.reservationId`.
3. Uses `reservation.quantity` as movement quantity.
4. Decrements `stock.quantity` by quantity and saves.
5. Sets `reservation.status = 'COMPLETED'` and saves.
6. Increments `warehouse.availableCapacity` by quantity and saves.
7. Creates a `Movement` with `type: ISSUE`, `status: COMPLETED`, `reservation` linked.
8. Operation is transactional.

---

### 6.6 Red → Green: ReceiveTransferStrategy

#### [NEW] `src/strategies/receive-transfer.strategy.spec.ts`

Mock: `employeeRepository`, `movementRepository`, `warehouseRepository`, `DataSource`.

**Tests:**
1. Throws `NotFoundException` when employee not found.
2. Fetches movements where `transferGroupId` matches and `status = IN_TRANSIT`.
3. Throws `NotFoundException` when no IN_TRANSIT movements found for the group.
4. **ACCEPT branch:**
   - Increments `destinationStock.quantity` for each movement.
   - Sets `movement.status = COMPLETED`.
   - Increments `originWarehouse.availableCapacity` by total quantity.
   - Does NOT modify `destinationWarehouse.availableCapacity`.
5. **REJECT branch:**
   - Increments `sourceStock.quantity` for each movement (rollback).
   - Sets `movement.status = REJECTED`.
   - Increments `destinationWarehouse.availableCapacity` by total quantity.
   - Does NOT modify `originWarehouse.availableCapacity`.
6. **High-Risk — Capacity Asymmetry check:**
   - On ACCEPT: origin capacity is freed. Verify destination capacity is NOT double-modified.
   - On REJECT: destination capacity is freed. Verify origin capacity is NOT changed.
7. Validates manager permission against `destinationWarehouse`.
8. All writes are transactional.

---

### 6.7 Fix the Await Gap (Green for all strategies)

After writing the failing test in 6.1.9, apply this fix to **all six strategies**. Change every private `validate()` method from:

```typescript
validator?.handle(context);
```

to:

```typescript
await validator?.handle(context);
```

This applies to:
- `entrance-movement.strategy.ts` (line 122)
- `issue-movement.strategy.ts` (line 92)
- `transfer-movement.strategy.ts` (line 105)
- `transfer-from-reservation.strategy.ts` (line 96)
- `issue-from-reservation.strategy.ts` (line 83)
- `receive-transfer.strategy.ts` (line 83)

---

## Phase 7 — E2E Test Suite

**Goal:** Full integration test coverage for all movement endpoints using a real test database.

---

### 7.1 Setup

#### [NEW] `test/movements.e2e-spec.ts`

Follow the same pattern as `auth.e2e-spec.ts` and `categories.e2e-spec.ts`:
- Use `@nestjs/testing` + `supertest`.
- Load `.env.testing` via `ConfigModule`.
- Obtain a JWT token before test suites (login as ADMINISTRATOR and as WAREHOUSE_MANAGER).
- Seed required entities (warehouse, employee, sku/lot, product variant, reservation) in `beforeAll`.
- Clean up movement records in `afterEach` to avoid state bleed between tests.

---

### 7.2 Tests by Endpoint

#### `POST /movements/entry`

| Scenario | Expected Status | Assertion |
|---|---|---|
| No auth token | 401 | |
| Valid token, wrong role | 403 | |
| Valid token, missing body fields | 400 | DTO validation error |
| Valid token, non-existent warehouse | 404 | |
| Valid token, non-existent SKU | 404 | |
| Valid token, warehouse at full capacity | 400 | |
| Happy path | 201 | `movement.type = 'ENTRANCE'`, `stock.quantity` incremented, `warehouse.availableCapacity` decremented, `sku.quantity` decremented |

#### `POST /movements/issue`

| Scenario | Expected Status | Assertion |
|---|---|---|
| No auth token | 401 | |
| Wrong role | 403 | |
| Missing body fields | 400 | |
| Non-existent product variant | 404 | |
| Insufficient stock | 400 | Seed stock < requested quantity |
| Happy path | 201 | Array of movements, `stock.quantity` decremented, `warehouse.availableCapacity` incremented |

#### `POST /movements/issue-from-reservation`

| Scenario | Expected Status | Assertion |
|---|---|---|
| No auth token | 401 | |
| Wrong role | 403 | |
| Missing body fields | 400 | |
| Non-existent reservation | 404 | |
| Reservation already COMPLETED | 400 | |
| Happy path | 200 | `reservation.status = 'COMPLETED'`, `stock.quantity` decremented, `warehouse.availableCapacity` incremented |

#### `POST /movements/transfer`

| Scenario | Expected Status | Assertion |
|---|---|---|
| No auth token | 401 | |
| Wrong role | 403 | |
| Missing body fields | 400 | |
| Non-existent destination warehouse | 404 | |
| Destination warehouse at full capacity | 400 | |
| Insufficient origin stock | 400 | |
| Happy path | 201 | `movement.status = 'IN_TRANSIT'`, `transferGroupId` is UUID, `originStock.quantity` decremented, `destinationWarehouse.availableCapacity` decremented |

#### `POST /movements/transfer-from-reservation`

| Scenario | Expected Status | Assertion |
|---|---|---|
| No auth token | 401 | |
| Wrong role | 403 | |
| Missing body fields | 400 | |
| Non-existent reservation | 404 | |
| Non-existent destination warehouse | 404 | |
| Happy path | 200 | `reservation.status = 'COMPLETED'`, `originStock.quantity` decremented, destination stock created |

#### `POST /movements/receive-transfer`

| Scenario | Expected Status | Assertion |
|---|---|---|
| No auth token | 401 | |
| Wrong role | 403 | |
| Missing body fields | 400 | |
| Non-existent/non-pending transferGroupId | 404 | |
| Invalid decision value | 400 | |
| ACCEPT happy path | 200 | `destinationStock.quantity` increased, `originWarehouse.availableCapacity` increased, movements `COMPLETED` |
| REJECT happy path | 200 | `sourceStock.quantity` restored, `destinationWarehouse.availableCapacity` restored, movements `REJECTED` |

#### `GET /movements/:id`

| Scenario | Expected Status | Assertion |
|---|---|---|
| No auth token | 401 | |
| Wrong role | 403 | |
| Non-existent id | 404 | |
| Valid id | 200 | Movement shape with `sourceStock` relation |

#### `GET /movements`

| Scenario | Expected Status | Assertion |
|---|---|---|
| No auth token | 401 | |
| Wrong role | 403 | |
| No filters | 200 | Returns array |
| `?type=ENTRANCE` | 200 | Only ENTRANCE movements |
| `?status=COMPLETED` | 200 | Only COMPLETED movements |
| `?warehouseId=X` | 200 | Filtered by source or destination warehouse |
| `?dateFrom=YYYY-MM-DD` | 200 | Only movements from that date |

---

## Phase 8 — Final Refactor & Coverage Hardening

1. Run `npm run test:cov`. Identify any uncovered branches in strategies, validators, or support services.
2. Add missing branch tests (e.g., edge cases like `quantity = 0`, `allocations = []`).
3. Ensure all spec files have descriptive test names using business language (e.g., `"rejects transfer when destination warehouse is at capacity"` not `"should throw 400"`).
4. Verify no `console.log` or debug statements remain in test files.
5. Remove the stale comment `// movements.service.ts — agregar:` on line 37 of `movements.service.ts`.

---

## File-by-File Modifications Summary

| File | Action | Phase |
|---|---|---|
| `src/movements/dto/create-entry.dto.ts` | MODIFY — add decorators | 1 |
| `src/movements/dto/create-issue.dto.ts` | MODIFY — add decorators | 1 |
| `src/movements/dto/transfer-movement.dto.ts` | MODIFY — add decorators | 1 |
| `src/movements/dto/transfer-from-reservation.dto.ts` | MODIFY — add decorators | 1 |
| `src/movements/dto/issue-from-reservation.dto.ts` | MODIFY — add `reservationId` decorators | 1 |
| `src/movements/dto/receive-transfer.dto.ts` | MODIFY — add decorators + `ReceiveDecision` enum | 1 |
| `src/movements/dto/find-movements.dto.ts` | VERIFY — already complete | 1 |
| `src/enums/movement-type.enum.ts` | MODIFY — add `ReceiveDecision` enum | 1 |
| `src/movements/movements.controller.ts` | MODIFY — Swagger decorators + `+id` coercion | 2 |
| `src/movements/dto/movements-dto.spec.ts` | NEW — DTO pipe tests | 1 |
| `src/movements/movements.controller.spec.ts` | MODIFY — replace stub with full suite | 3 |
| `src/movements/movements.service.spec.ts` | MODIFY — replace stub with full suite | 3 |
| `src/factories/movement-strategy.factory.spec.ts` | NEW | 4 |
| `src/factories/validation.factory.spec.ts` | NEW | 4 |
| `src/validations/lot-available.validator.spec.ts` | NEW | 4 |
| `src/validations/sku-existence.validator.spec.ts` | NEW | 4 |
| `src/validations/is-warehouse-manager.validator.spec.ts` | NEW | 4 |
| `src/validations/warehouse-capacity.validator.spec.ts` | NEW | 4 |
| `src/validations/product-variant-existence.validator.spec.ts` | NEW | 4 |
| `src/validations/reservation-existence.validator.spec.ts` | NEW | 4 |
| `src/validations/reservation-status.validator.spec.ts` | NEW | 4 |
| `src/validations/stock-availability.validator.spec.ts` | NEW | 4 |
| `src/validations/destination-warehouse-capacity.validator.spec.ts` | NEW | 4 |
| `src/movements/support/movement-entity-resolver.service.spec.ts` | NEW | 5 |
| `src/movements/support/stock-allocation.service.spec.ts` | NEW | 5 |
| `src/strategies/entrance-movement.strategy.spec.ts` | NEW | 6 |
| `src/strategies/issue-movement.strategy.spec.ts` | NEW | 6 |
| `src/strategies/transfer-movement.strategy.spec.ts` | NEW | 6 |
| `src/strategies/transfer-from-reservation.strategy.spec.ts` | NEW | 6 |
| `src/strategies/issue-from-reservation.strategy.spec.ts` | NEW | 6 |
| `src/strategies/receive-transfer.strategy.spec.ts` | NEW | 6 |
| `src/strategies/entrance-movement.strategy.ts` | MODIFY — await validator | 6 |
| `src/strategies/issue-movement.strategy.ts` | MODIFY — await validator | 6 |
| `src/strategies/transfer-movement.strategy.ts` | MODIFY — await validator | 6 |
| `src/strategies/transfer-from-reservation.strategy.ts` | MODIFY — await validator | 6 |
| `src/strategies/issue-from-reservation.strategy.ts` | MODIFY — await validator | 6 |
| `src/strategies/receive-transfer.strategy.ts` | MODIFY — await validator | 6 |
| `test/movements.e2e-spec.ts` | NEW | 7 |
| `src/movements/movements.service.ts` | MODIFY — remove stale comment | 8 |

---

## Test Matrix

| Layer | File | Approx. Count |
|---|---|---|
| DTO pipe | `movements-dto.spec.ts` | ~20 |
| Controller unit | `movements.controller.spec.ts` | ~10 |
| Service unit | `movements.service.spec.ts` | ~16 |
| Strategy factory unit | `movement-strategy.factory.spec.ts` | ~6 |
| Validation factory unit | `validation.factory.spec.ts` | ~10 |
| Validator unit (×9) | `*.validator.spec.ts` | ~27 |
| Entity resolver unit | `movement-entity-resolver.service.spec.ts` | ~9 |
| Stock allocation unit | `stock-allocation.service.spec.ts` | ~8 |
| Strategy unit (×6) | `*.strategy.spec.ts` | ~48 |
| E2E | `movements.e2e-spec.ts` | ~30 |
| **Total** | | **~184** |

---

## Swagger Completion Checklist

### DTOs

- [ ] `create-entry.dto.ts` — 4 fields: `@ApiProperty` + validators
- [ ] `create-issue.dto.ts` — 4 fields: `@ApiProperty` + validators
- [ ] `transfer-movement.dto.ts` — 5 fields: `@ApiProperty` + validators
- [ ] `transfer-from-reservation.dto.ts` — 3 fields: `@ApiProperty` + validators
- [ ] `issue-from-reservation.dto.ts` — `reservationId` missing decorator added
- [ ] `receive-transfer.dto.ts` — 3 fields: `@ApiProperty` + `@IsEnum(ReceiveDecision)`
- [ ] `find-movements.dto.ts` — verified complete (no changes needed)

### Controller Endpoints

- [ ] `POST /movements/entry` — `@ApiOperation`, `@ApiCreatedResponse`, error decorators
- [ ] `POST /movements/issue` — `@ApiOperation`, `@ApiCreatedResponse` (array), error decorators
- [ ] `POST /movements/issue-from-reservation` — `@ApiOperation`, `@ApiOkResponse`, error decorators
- [ ] `POST /movements/transfer` — `@ApiOperation`, `@ApiCreatedResponse` (array), error decorators
- [ ] `POST /movements/transfer-from-reservation` — `@ApiOperation`, `@ApiOkResponse`, error decorators
- [ ] `POST /movements/receive-transfer` — `@ApiOperation`, `@ApiOkResponse` (array), error decorators
- [ ] `GET /movements/:id` — `@ApiOperation`, `@ApiOkResponse`, `@ApiNotFoundResponse`
- [ ] `GET /movements` — `@ApiOperation`, `@ApiOkResponse` (array)

---

## High-Risk Logic Summary

| Risk | Location | Failing Test Scenario | Fix Target |
|---|---|---|---|
| Unawaited validator chain | All 6 strategy `validate()` methods | Mock a rejecting async validator; prove it fires after `await` is added | Add `await validator?.handle(context)` in all strategies |
| `findAll` falsy filter skip | `movements.service.ts` lines 80–114 | `findAll({ warehouseId: 0 })` skips filter due to `if (query?.warehouseId)` falsy check | Change to `if (query?.warehouseId !== undefined)` |
| `ReceiveDecision` untyped | `receive-transfer.dto.ts` | `{ decision: 'INVALID' }` accepted at runtime | Add `@IsEnum(ReceiveDecision)` + create enum |
| `@Param('id')` as string | `movements.controller.ts` line 54 | `findOne('abc')` passed to service as string | Use `+id` unary coercion in method body |

---

## Verification Checklist

```bash
# Run all unit tests
npm run test

# Run E2E tests (requires test DB running)
npm run test:e2e

# Check coverage
npm run test:cov
```

### Acceptance Criteria

- [ ] All movement-related unit test suites pass (controller, service, factories, validators, support services, strategies).
- [ ] `test/movements.e2e-spec.ts` passes fully against the test database.
- [ ] No regressions in `auth.e2e-spec.ts` or `categories.e2e-spec.ts`.
- [ ] Branch coverage ≥ 80% for `src/strategies/**`, `src/factories/**`, and `src/validations/**`.
- [ ] Swagger UI renders all 8 movement endpoints with explicit success and error response types.
- [ ] `npm run build` completes without TypeScript errors after all changes.
