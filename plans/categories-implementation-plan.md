# Implementation Plan: Categories Module — TDD, Validations & Business Logic

> **Reference Spec:** [`specs/categories-test-spec.md`](../specs/categories-test-spec.md)
> **Target Files:** `src/categories/**`, `test/categories.e2e-spec.ts`

---

## Background & Context

The `Categories` module manages inventory categories (`Category` entity) via a full CRUD API. Write operations (`POST`, `PATCH`, `DELETE`) require the `ADMINISTRATOR` role; read operations (`GET`) require only a valid JWT. Current tests are empty stubs.

The following gaps are addressed in this plan:

1. **No DTO validation** — `CreateCategoryDto` and `UpdateCategoryDto` have no `class-validator` decorators.
2. **No uniqueness enforcement** — the service allows duplicate category names.

> **IMPORTANT:** Write the **failing tests first**. Then implement the fix/feature that makes them pass. Do NOT skip writing a failing test before writing code.

---

## Phase 1 — DTO Validation

### File: [MODIFY] `src/categories/dto/create-category.dto.ts`

**Changes required:**
- Import `IsString`, `IsNotEmpty`, `MinLength` from `class-validator`.
- Decorate `name` with `@IsString()`, `@IsNotEmpty()`, `@MinLength(2)`.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Red Wines', description: 'Name of the category' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;
}
```

### File: [MODIFY] `src/categories/dto/update-category.dto.ts`

`UpdateCategoryDto` already extends `PartialType(CreateCategoryDto)` from `@nestjs/swagger`. When using `@nestjs/swagger`'s `PartialType`, the `class-validator` decorators are automatically inherited and wrapped with `@IsOptional()`. **No additional changes are needed in this file** — but the implementation plan must include a test to verify that sending `{ name: "" }` on `PATCH` still produces a `400`.

> **Note:** If `PartialType` is imported from `@nestjs/mapped-types` instead of `@nestjs/swagger`, class-validator decorators would not be inherited. Confirm the current import source is `@nestjs/swagger` (it is, per the current file).

---

## Phase 2 — Business Logic Enhancement (`src/categories/categories.service.ts`)

### Uniqueness Check on `create`

**Problem:** Two categories can currently have identical names.

**Rule:** Category names must be **globally unique** (case-insensitive match is optional — implement case-sensitive first for simplicity unless specified otherwise).

**Fix — `create` method:**

```typescript
async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
  const existing = await this.repository.findOne({ where: { name: createCategoryDto.name } });
  if (existing) {
    throw new ConflictException('Category name already exists');
  }
  const category = this.repository.create(createCategoryDto);
  return await this.repository.save(category);
}
```

### Uniqueness Check on `update`

**Rule:** If a `PATCH` request provides a `name` that already exists in the database (for ANY category, including the same one being updated), throw `ConflictException`.

**Fix — `update` method:**

```typescript
async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
  const category = await this.repository.findOne({ where: { id } });
  if (!category) {
    throw new NotFoundException(`The category with id #${id} was not found`);
  }
  if (updateCategoryDto.name) {
    const nameConflict = await this.repository.findOne({ where: { name: updateCategoryDto.name } });
    if (nameConflict) {
      throw new ConflictException('Category name already exists');
    }
  }
  const updatedCategory = Object.assign(category, updateCategoryDto);
  return await this.repository.save(updatedCategory);
}
```

> **Note from user answers:** If a category is updated with its own current name, the check must still throw `ConflictException`. The existing `findOne` by name will find itself and trigger the conflict. This is the intended behavior.

### Soft Delete — No changes needed

The `remove` method already sets `category.active = false` and saves. The plan requires only tests to **verify** this behavior — no code changes needed here.

---

## Phase 3 — Unit Tests

### File: [MODIFY] `src/categories/categories.service.spec.ts`

**Setup:**
- Provide a mock `Repository<Category>` using jest mock functions for: `findOne`, `find`, `create`, `save`.
- Use `jest.fn().mockResolvedValue(...)` for async control.

**Test cases to implement:**

#### `describe('create')`

| # | Test name | Mock setup | Expected |
|---|-----------|-----------|----------|
| 1 | `should create and return a new category when name is unique` | `findOne` returns `null`; `create` and `save` return a category | Returns `Category` object |
| 2 | `should throw ConflictException when name already exists` | `findOne` returns an existing category | Throws `ConflictException` |

#### `describe('findAll')`

| # | Test name | Mock setup | Expected |
|---|-----------|-----------|----------|
| 3 | `should return all categories when active filter is undefined` | `find` returns array of mixed categories | `find` called with `{}`; returns all categories |
| 4 | `should return only active categories when active is true` | `find` returns array of active categories | `find` called with `{ where: { active: true } }` |
| 5 | `should return only inactive categories when active is false` | `find` returns array of inactive categories | `find` called with `{ where: { active: false } }` |

#### `describe('findOne')`

| # | Test name | Mock setup | Expected |
|---|-----------|-----------|----------|
| 6 | `should return a category when ID exists` | `findOne` returns category | Returns `Category` object |
| 7 | `should throw NotFoundException when ID does not exist` | `findOne` returns `null` | Throws `NotFoundException` |

#### `describe('update')`

| # | Test name | Mock setup | Expected |
|---|-----------|-----------|----------|
| 8 | `should update and return the category when ID exists and name is unique` | First `findOne` returns category; second `findOne` (name check) returns `null`; `save` returns updated | Returns updated `Category` |
| 9 | `should throw NotFoundException when category ID does not exist` | First `findOne` returns `null` | Throws `NotFoundException` |
| 10 | `should throw ConflictException when updated name conflicts with existing category` | First `findOne` returns category; second `findOne` returns a different category with same name | Throws `ConflictException` |

#### `describe('remove')`

| # | Test name | Mock setup | Expected |
|---|-----------|-----------|----------|
| 11 | `should set active to false and save the category` | `findOne` returns active category; `save` resolves | `save` called with `{ ...category, active: false }`; returns updated category |
| 12 | `should throw NotFoundException when ID does not exist` | `findOne` returns `null` | Throws `NotFoundException` |

---

### File: [MODIFY] `src/categories/categories.controller.spec.ts`

**Setup:**
- Mock `CategoriesService` with jest functions for all methods.
- Provide the mock service via `Test.createTestingModule`.
- Guards (`JwtAuthGuard`, `RolesGuard`) should be overridden with `{ canActivate: () => true }` to isolate controller logic from auth.

**Test cases to implement:**

#### `describe('create')`

| # | Test name | Setup | Expected |
|---|-----------|-------|----------|
| 1 | `should delegate the DTO to service create and return result` | `service.create` returns a mock category | Controller returns the category |

#### `describe('findAll')`

| # | Test name | Input | Expected |
|---|-----------|-------|----------|
| 2 | `should pass undefined to service when no active query param` | `active` query = `undefined` | `service.findAll(undefined)` called |
| 3 | `should pass true to service when active query is "true"` | `active` query = `'true'` | `service.findAll(true)` called |
| 4 | `should pass false to service when active query is "false"` | `active` query = `'false'` | `service.findAll(false)` called |
| 5 | `should pass undefined to service for unrecognized active value` | `active` query = `'yes'` | `service.findAll(undefined)` called |

#### `describe('findOne')`

| # | Test name | Input | Expected |
|---|-----------|-------|----------|
| 6 | `should convert string id param to number and delegate to service` | Param `id = '3'` | `service.findOne(3)` called (number, not string) |

#### `describe('update')`

| # | Test name | Input | Expected |
|---|-----------|-------|----------|
| 7 | `should delegate id as number and updateDto to service` | Param `id = '5'`, valid DTO | `service.update(5, dto)` called |

#### `describe('remove')`

| # | Test name | Input | Expected |
|---|-----------|-------|----------|
| 8 | `should delegate id as number to service remove` | Param `id = '2'` | `service.remove(2)` called |

---

## Phase 4 — E2E / Integration Tests

### File: [NEW] `test/categories.e2e-spec.ts`

**Database strategy:** Use **SQLite in-memory** by overriding the TypeORM module in test setup with `type: 'better-sqlite3'` and `database: ':memory:'`, registering both `Category` entity.

**Module & app setup:**

```typescript
app = moduleFixture.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
await app.init();
```

**IMPORTANT:** `ValidationPipe` is NOT in `main.ts`. Must be applied with `app.useGlobalPipes()` in the test setup. Do NOT modify `main.ts`.

**Auth token strategy for E2E tests:**

Since this test suite covers both authentication AND authorization, two real JWT tokens must be generated. The recommended approach:

1. Inject `JwtService` from the test module.
2. Call `jwtService.sign({ sub: 1, email: 'admin@test.com', roles: 'ADMINISTRATOR' })` for admin token.
3. Call `jwtService.sign({ sub: 2, email: 'employee@test.com', roles: 'EMPLOYEE' })` for regular employee token.

> This avoids needing to call `POST /auth/login` from within the categories E2E suite, keeping tests decoupled.

**Pre-test seeding:**
In `beforeAll`, insert an initial category via `Repository<Category>` to seed data for read/update/delete tests.

---

**Test cases to implement:**

#### `describe('POST /categories')`

| # | Test name | Auth | Payload | Expected |
|---|-----------|------|---------|----------|
| 1 | `should return 401 when no token provided` | None | `{ name: 'Wine' }` | `401` |
| 2 | `should return 403 when non-admin token provided` | Employee token | `{ name: 'Wine' }` | `403` |
| 3 | `should return 400 for empty name` | Admin token | `{ name: '' }` | `400` |
| 4 | `should return 400 for name shorter than 2 chars` | Admin token | `{ name: 'A' }` | `400` |
| 5 | `should return 400 for numeric name` | Admin token | `{ name: 123 }` | `400` |
| 6 | `should return 400 for missing name field` | Admin token | `{}` | `400` |
| 7 | `should return 201 and create category with unique name` | Admin token | `{ name: 'Red Wines' }` | `201`, body contains `id`, `name`, `active: true` |
| 8 | `should return 409 when category name already exists` | Admin token | Same name as created in test #7 | `409` |

#### `describe('GET /categories')`

| # | Test name | Auth | Query | Expected |
|---|-----------|------|-------|----------|
| 9 | `should return 401 when no token provided` | None | — | `401` |
| 10 | `should return 200 and list of all categories` | Employee token | No query | `200`, array response |
| 11 | `should return 200 and only active categories` | Employee token | `?active=true` | `200`, all items have `active: true` |
| 12 | `should return 200 and only inactive categories` | Employee token | `?active=false` | `200`, all items have `active: false` |

#### `describe('GET /categories/:id')`

| # | Test name | Auth | Input | Expected |
|---|-----------|------|-------|----------|
| 13 | `should return 401 when no token provided` | None | Valid ID | `401` |
| 14 | `should return 200 and the category for a valid ID` | Employee token | Seeded category ID | `200`, correct category object |
| 15 | `should return 404 for a non-existent ID` | Employee token | `99999` | `404` |

#### `describe('PATCH /categories/:id')`

| # | Test name | Auth | Input | Expected |
|---|-----------|------|-------|----------|
| 16 | `should return 401 when no token provided` | None | Valid ID + DTO | `401` |
| 17 | `should return 403 for non-admin token` | Employee token | Valid ID + DTO | `403` |
| 18 | `should return 404 for non-existent ID` | Admin token | `99999` + `{ name: 'NewName' }` | `404` |
| 19 | `should return 200 and updated category for valid request` | Admin token | Seeded ID + `{ name: 'Updated Name' }` | `200`, category with updated `name` |
| 20 | `should return 409 when updated name conflicts with existing name` | Admin token | Valid ID + existing name | `409` |

#### `describe('DELETE /categories/:id')`

| # | Test name | Auth | Input | Expected |
|---|-----------|------|-------|----------|
| 21 | `should return 401 when no token provided` | None | Valid ID | `401` |
| 22 | `should return 403 for non-admin token` | Employee token | Valid ID | `403` |
| 23 | `should return 404 for non-existent ID` | Admin token | `99999` | `404` |
| 24 | `should return 200 and category with active set to false` | Admin token | Seeded ID | `200`, body has `active: false` |
| 25 | `should appear in GET /categories?active=false after deletion` | Admin token | After test #24 | `GET` with `?active=false` returns the deleted category |

---

## Summary of Files Modified / Created

| Action | File | Reason |
|--------|------|--------|
| MODIFY | `src/categories/dto/create-category.dto.ts` | Add `class-validator` decorators |
| NO CHANGE | `src/categories/dto/update-category.dto.ts` | `PartialType` inherits validators from `CreateCategoryDto` automatically |
| MODIFY | `src/categories/categories.service.ts` | Add `ConflictException` import; add uniqueness check in `create` and `update` |
| MODIFY | `src/categories/categories.service.spec.ts` | Full unit test suite (12 test cases) |
| MODIFY | `src/categories/categories.controller.spec.ts` | Full unit test suite (8 test cases) |
| NEW | `test/categories.e2e-spec.ts` | Full E2E integration suite with SQLite in-memory (25 test cases) |

---

## Verification Checklist

- [ ] `npm run test` — all unit tests in `src/categories/` pass
- [ ] `npm run test:e2e` — all tests in `test/categories.e2e-spec.ts` pass
- [ ] `npm run test:cov` — `categories.service.ts` and `categories.controller.ts` reach 100% branch coverage
- [ ] Confirm TDD flow: uniqueness tests (# 8, 10, 20) fail BEFORE the `ConflictException` logic is added, pass AFTER
- [ ] Confirm soft-delete test (#24) verifies `active: false` (not hard delete)
