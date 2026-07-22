# Specification Plan: Movements Module TDD + Swagger Completion

## Purpose
This document defines a specification blueprint that an LLM must use to write an implementation plan. The implementation plan's final objective is to deliver test-first validation (TDD) for movements domain behavior and complete missing Swagger documentation in movement DTOs and controller endpoints.

The resulting implementation plan must be executable, phased, and strict about Red-Green-Refactor discipline.

---

## Primary Objective
Guide the implementation plan to ensure:
1. Tests are written first (failing), then implementation is added/fixed, then refactor.
2. Movement behavior is verified across strategies, services, validations, factories, and support services.
3. Swagger documentation is completed for movements DTOs and controller responses (success and error responses).
4. Potential logic flaws are intentionally surfaced through failing tests before code changes.

---

## Scope
The implementation plan generated from this spec must include:
1. Unit tests for movements controller and movements service.
2. Unit tests for movement and validation factories.
3. Unit tests for validation handlers.
4. Unit tests for movement strategies.
5. Unit tests for support services involved in movement resolution and allocation.
6. E2E tests for movement endpoints.
7. DTO Swagger + validation completion.
8. Movement controller Swagger endpoint response completion.

Out of scope:
1. Refactors unrelated to movement domain.
2. API redesign outside existing route contracts.
3. Performance work unless required to fix functional correctness.

---

## Architecture Map (Must Be Referenced In The Implementation Plan)
The generated implementation plan must map changes to these files/groups:
1. Controller and orchestration
- src/movements/movements.controller.ts
- src/movements/movements.service.ts

2. DTOs
- src/movements/dto/create-entry.dto.ts
- src/movements/dto/create-issue.dto.ts
- src/movements/dto/transfer-movement.dto.ts
- src/movements/dto/transfer-from-reservation.dto.ts
- src/movements/dto/receive-transfer.dto.ts
- src/movements/dto/issue-from-reservation.dto.ts
- src/movements/dto/find-movements.dto.ts

3. Factories
- src/factories/movement-strategy.factory.ts
- src/factories/validation.factory.ts

4. Strategies
- src/strategies/entrance-movement.strategy.ts
- src/strategies/issue-movement.strategy.ts
- src/strategies/transfer-movement.strategy.ts
- src/strategies/transfer-from-reservation.strategy.ts
- src/strategies/issue-from-reservation.strategy.ts
- src/strategies/receive-transfer.strategy.ts

5. Support services
- src/movements/support/movement-entity-resolver.service.ts
- src/movements/support/stock-allocation.service.ts

6. Validators
- src/validations/lot-available.validator.ts
- src/validations/sku-existence.validator.ts
- src/validations/is-warehouse-manager.validator.ts
- src/validations/warehouse-capacity.validator.ts
- src/validations/product-variant-existence.validator.ts
- src/validations/reservation-existence.validator.ts
- src/validations/reservation-status.validator.ts
- src/validations/stock-availability.validator.ts
- src/validations/destination-warehouse-capacity.validator.ts
- src/validations/validation.handler.ts
- src/validations/movement-validation-context.interface.ts

7. Test destinations
- src/movements/movements.controller.spec.ts
- src/movements/movements.service.spec.ts
- src/strategies/*.spec.ts (new)
- src/factories/*.spec.ts (new)
- src/validations/*.spec.ts (new)
- src/movements/support/*.spec.ts (new)
- test/movements.e2e-spec.ts (new)

---

## Required Output Contract For The LLM-Generated Implementation Plan
The implementation plan produced by the LLM must include all of the following sections:
1. Background and context.
2. Explicit assumptions and unresolved questions.
3. Phase-by-phase Red-Green-Refactor execution.
4. File-by-file modifications list.
5. Test matrix by layer (unit/integration/e2e).
6. Swagger completion checklist per endpoint and DTO.
7. Verification checklist with commands and expected pass criteria.

If any section is missing, the plan is incomplete.

---

## TDD Rules (Mandatory)
The generated implementation plan must enforce:
1. No production code changes before at least one failing test exists for that behavior.
2. Each phase must identify what fails in Red, what change is applied in Green, and what cleanup happens in Refactor.
3. Every branch introduced or currently present in movement logic must be test-covered.
4. Test names must encode business behavior, not implementation details.

---

## Mandatory Test Domains And Behaviors

### 1. MovementsController Unit Tests
The implementation plan must include tests for:
1. Delegation of each endpoint to the proper service method.
2. Param/query handling for findOne and findAll.
3. Response contracts alignment with service outputs.
4. Guarded route behavior assumptions (unit level via guard overrides; auth logic validated in e2e).

Endpoints to cover:
1. POST /movements/entry
2. POST /movements/issue
3. POST /movements/issue-from-reservation
4. POST /movements/transfer
5. POST /movements/transfer-from-reservation
6. POST /movements/receive-transfer
7. GET /movements/:id
8. GET /movements

### 2. MovementsService Unit Tests
The implementation plan must include tests for:
1. Strategy selection by movement type for entry, issue, transfer, transfer-from-reservation, issue-from-reservation.
2. Direct receive-transfer strategy execution path.
3. findOne success and NotFoundException branch.
4. findAll query filters and ordering behavior.
5. Optional query parameters behavior (including explicit values that should not be skipped).

### 3. MovementStrategyFactory Unit Tests
The implementation plan must include tests for:
1. Correct strategy object returned per MovementType.
2. Unsupported movement type throws BadRequestException.

### 4. ValidationFactory Unit Tests
The implementation plan must include tests for:
1. Correct validator returned for each known rule string.
2. Invalid rule throws BadRequestException.

### 5. Validation Handlers Unit Tests
For each validator, include pass-through and fail branch tests:
1. Lot availability and lot state checks.
2. SKU existence/quantity checks.
3. Warehouse manager permission checks.
4. Origin and destination capacity checks.
5. Reservation existence and active-status checks.
6. Stock existence, active-state, and available quantity checks.

### 6. Support Services Unit Tests
The implementation plan must include tests for:
1. MovementEntityResolverService:
- warehouse/employee/product variant not-found branches
- reservation-stock-warehouse resolution and not-found branches
2. StockAllocationService:
- FEFO allocation order
- reservation-adjusted available quantity
- insufficient stock remaining behavior
- find-or-create stock behavior

### 7. Strategy Unit Tests
The implementation plan must include behavior tests for each strategy:
1. Entrance movement
- validations chain invoked
- stock create/update behavior
- warehouse capacity impact
- SKU quantity impact
- movement creation fields
2. Issue movement
- FEFO allocation usage
- insufficient stock branch
- stock decrement
- warehouse capacity release
- movement creation list
3. Transfer movement
- destination warehouse existence
- destination capacity validation
- IN_TRANSIT status and transferGroupId
- origin decrement, destination stock creation/reuse
4. Transfer from reservation
- reservation-based origin resolution
- reservation completion
- destination capacity update
- transfer movement generation
5. Issue from reservation
- reservation completion
- stock decrement
- warehouse capacity release
- completed issue movement generation
6. Receive transfer
- pending transfer lookup by transferGroupId
- ACCEPT branch: destination stock increase + COMPLETED status
- REJECT branch: source stock rollback + REJECTED status
- warehouse capacity counterpart updates

### 8. E2E Tests For Movements Endpoints
The implementation plan must require:
1. Authentication checks (401) on protected routes.
2. Authorization checks (403) for disallowed roles.
3. DTO validation checks (400) for malformed payloads.
4. Not-found checks (404) for missing entities where applicable.
5. Conflict checks (409) where business logic can produce conflict semantics.
6. Happy-path success checks with expected status and response shape.
7. Cross-entity state assertions after successful operations.

---

## Mandatory Swagger Completion Requirements

### 1. DTO Swagger + Validation Completion
The implementation plan must require adding/standardizing:
1. ApiProperty / ApiPropertyOptional metadata for each field.
2. class-validator rules aligned to each field type and constraints.
3. class-transformer numeric/date transformations where needed for query DTOs.

DTO targets:
1. create-entry.dto.ts
2. create-issue.dto.ts
3. transfer-movement.dto.ts
4. transfer-from-reservation.dto.ts
5. receive-transfer.dto.ts
6. issue-from-reservation.dto.ts
7. find-movements.dto.ts (consistency review)

### 2. Controller Swagger Completion
The implementation plan must require endpoint annotations for:
1. ApiOperation summary/description.
2. Success responses:
- ApiCreatedResponse for creation endpoints when applicable.
- ApiOkResponse for retrieval/update/receive operations when applicable.
3. Error responses as applicable per endpoint:
- ApiBadRequestResponse
- ApiUnauthorizedResponse
- ApiForbiddenResponse
- ApiNotFoundResponse
- ApiConflictResponse

The implementation plan must explicitly map response DTO/type:
1. Single Movement response endpoints.
2. Movement array response endpoints.

---

## High-Risk Logic Checks (Must Be Test-Driven)
The generated implementation plan must include Red tests for suspected issues, such as:
1. Entrance flow quantity direction semantics for SKU/stock updates.
2. Optional filter handling in findAll that may ignore valid explicit values.
3. Transfer receive branch asymmetry in capacity/stock updates.
4. Reservation-to-movement status consistency and terminal states.

Each suspected issue must be framed as:
1. Failing test scenario.
2. Expected business behavior.
3. Minimal code change target.
4. Regression test retained after fix.

---

## Recommended Phase Order For The Generated Implementation Plan
1. Phase 1: DTO validation + Swagger metadata baseline.
2. Phase 2: Controller Swagger response completion.
3. Phase 3: Controller and service unit tests.
4. Phase 4: Factory and validator unit tests.
5. Phase 5: Support service unit tests.
6. Phase 6: Strategy unit tests.
7. Phase 7: Movement E2E suite.
8. Phase 8: Final refactor, naming cleanup, and coverage hardening.

---

## Verification Checklist Required In The Generated Implementation Plan
The final implementation plan must require execution of:
1. npm run test
2. npm run test:e2e
3. npm run test:cov

And must define acceptance criteria:
1. All movement-related suites pass.
2. No regressions in existing auth/categories suites.
3. Branch coverage includes strategy/factory/validator failure paths.
4. Swagger docs render all movement endpoints with explicit success/error responses.

---

## Deliverable Quality Bar
The implementation plan generated from this spec is valid only if it:
1. Is actionable without adding undefined tasks.
2. Uses file-specific instructions, not generic recommendations.
3. Preserves TDD discipline from first to last phase.
4. Addresses both correctness and API documentation completeness.
