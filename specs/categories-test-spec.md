# Specification Plan: Categories Module Testing & Validation (TDD)

## Overview
This specification plan guides an AI assistant (or developer) to implement comprehensive **Unit Tests**, **Integration (E2E) Tests**, **DTO Validations**, and **Business Logic Enhancements** (unique category names & soft delete verification) for the `Categories` module (`src/categories`).

The `Categories` module manages inventory category records (`Category` entity), protected by `JwtAuthGuard` and `RolesGuard` (`ADMINISTRATOR` role required for write operations).

---

## 1. Scope & Objectives
1. **DTO Validation & Business Rules**:
   - Add `class-validator` rules to `CreateCategoryDto` and `UpdateCategoryDto` (`src/categories/dto`).
   - Enforce **Unique Category Name** check in `CategoriesService` (throw `ConflictException` 409 if a category name already exists).
   - Maintain and verify **Soft Delete** logic via the `active` attribute (`active = false`).
2. **Unit Testing (`src/categories/*.spec.ts`)**:
   - `CategoriesService`: Test `create`, `findAll` (active filtering), `findOne`, `update`, and `remove` methods against a mocked TypeORM `Repository<Category>`.
   - `CategoriesController`: Test route handler delegations, query parsing, and exception throwing.
3. **Integration / E2E Testing (`test/categories.e2e-spec.ts`)**:
   - Test endpoints: `POST /categories`, `GET /categories`, `GET /categories/:id`, `PATCH /categories/:id`, `DELETE /categories/:id`.
   - Test Authentication (`401 Unauthorized` without valid Bearer Token).
   - Test Authorization (`403 Forbidden` for non-`ADMINISTRATOR` roles on write endpoints).
   - Test DTO validation errors (`400 Bad Request`).
   - Test Category Name Conflict (`409 Conflict`).
   - Test Entity Not Found (`404 Not Found`).

---

## 2. Technical Analysis & Discovered Gaps

### Existing Codebase Assessment
- **DTOs (`create-category.dto.ts`, `update-category.dto.ts`)**: Currently lack `@IsString()`, `@IsNotEmpty()`, `@MinLength()` validation decorators.
- **Service (`categories.service.ts`)**:
  - `create`: Currently saves category without checking if `name` already exists. Needs uniqueness check.
  - `findAll`: Filters by `active` parameter (`true` / `false` / `undefined`).
  - `findOne` & `update` & `remove`: Throw `NotFoundException` if entity is missing.
  - `remove`: Soft deletes by setting `category.active = false` and saving.
- **Controller (`categories.controller.ts`)**:
  - `POST`, `PATCH`, `DELETE`: Protected by `@Roles('ADMINISTRATOR')` + `@UseGuards(JwtAuthGuard, RolesGuard)`.
  - `GET`, `GET :id`: Protected by `@UseGuards(JwtAuthGuard)`.
- **Current Tests**: Minimal boilerplate `it('should be defined')`.

---

## 3. Required Modifications (TDD Implementation Order)

### Phase 1: DTO Validation & Schema Rules (`src/categories/dto`)
- **`CreateCategoryDto`**:
  - `name`: Must be a non-empty string, trimmed, min length 2 (`@IsString()`, `@IsNotEmpty()`, `@MinLength(2)`).
- **`UpdateCategoryDto`**:
  - Inherits or uses `PartialType(CreateCategoryDto)` or `@IsOptional()` decorators with validation.

### Phase 2: Business Logic Enhancements (`src/categories/categories.service.ts`)
- **Category Uniqueness Rule**:
  - In `create(createCategoryDto)`: Check if category with `name` exists (`this.repository.findOne({ where: { name } })`). If found, throw `ConflictException('Category name already exists')`.
  - In `update(id, updateCategoryDto)`: If `name` is changed and matches another category's name, throw `ConflictException`.
- **Soft Delete Rule**:
  - In `remove(id)`: Fetch category, set `category.active = false`, save and return. Ensure `active: false` is retained.

### Phase 3: Unit Testing (`src/categories`)
#### `CategoriesService` Unit Tests (`src/categories/categories.service.spec.ts`)
- **`create`**:
  - Successful creation when name is unique.
  - Throw `ConflictException` when name already exists in repository.
- **`findAll(active)`**:
  - Returns all categories when `active` is `undefined`.
  - Returns only active categories when `active = true`.
  - Returns only inactive categories when `active = false`.
- **`findOne(id)`**:
  - Returns category object when ID exists.
  - Throws `NotFoundException` when ID does not exist.
- **`update(id, updateDto)`**:
  - Updates and returns category when ID exists.
  - Throws `NotFoundException` when category does not exist.
  - Throws `ConflictException` if updated name conflicts with another existing category.
- **`remove(id)`**:
  - Sets `active = false` and saves when category exists.
  - Throws `NotFoundException` when category does not exist.

#### `CategoriesController` Unit Tests (`src/categories/categories.controller.spec.ts`)
- **`create`**: Delegates DTO to service `create`.
- **`findAll`**: Passes query parameter `'true'` -> `true`, `'false'` -> `false`, `undefined` -> `undefined` to service `findAll`.
- **`findOne`**: Converts `:id` string to number (`+id`) and calls service `findOne`.
- **`update`**: Delegates `:id` and update DTO to service `update`.
- **`remove`**: Delegates `:id` to service `remove`.

### Phase 4: Integration / E2E Testing (`test/categories.e2e-spec.ts`)
- **Suite Setup**:
  - Configure NestJS testing module with JWT auth strategy/mocks, `ValidationPipe({ whitelist: true })`, and seeded employee tokens (`ADMINISTRATOR` token & standard `EMPLOYEE` token).
- **Scenarios to Test**:
  - **Unauthenticated Access (`401 Unauthorized`)**:
    - Call `GET /categories`, `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` without `Authorization` header.
  - **Unauthorized Role Access (`403 Forbidden`)**:
    - Call `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` with non-`ADMINISTRATOR` Bearer Token.
  - **DTO Validation Failures (`400 Bad Request`)**:
    - Send invalid payload to `POST /categories` (e.g. `{ name: "" }`, `{ name: 123 }`).
  - **Category Name Uniqueness Conflict (`409 Conflict`)**:
    - Create a category, then attempt to create another category with the exact same name.
  - **Find All & Filter**:
    - `GET /categories?active=true` -> Returns active categories.
    - `GET /categories?active=false` -> Returns inactive categories.
  - **Find One (`200 OK` / `404 Not Found`)**:
    - Valid ID returns category object.
    - Non-existent ID returns `404 Not Found`.
  - **Update (`200 OK` / `404 Not Found` / `409 Conflict`)**:
    - Update name and verify updated entity returned.
  - **Soft Delete (`200 OK` or `203` / `404 Not Found`)**:
    - `DELETE /categories/:id` sets `active` flag to `false`. Subsequent `GET /categories?active=false` contains deleted category.

---

## 4. Test Matrix & Verification Checklist

| Endpoint / Target | Test Type | Condition / Input | Expected Result |
| :--- | :--- | :--- | :--- |
| `POST /categories` | E2E / Integration | Missing Auth Header | `401 Unauthorized` |
| `POST /categories` | E2E / Integration | Standard Employee Token | `403 Forbidden` |
| `POST /categories` | E2E / Integration | Admin Token + Invalid DTO | `400 Bad Request` |
| `POST /categories` | E2E / Integration | Admin Token + Unique Name | `201 Created`, returns Category |
| `POST /categories` | E2E / Integration | Admin Token + Existing Name | `409 ConflictException` |
| `GET /categories` | E2E / Integration | Admin or Employee Token | `200 OK`, returns Category list |
| `GET /categories?active=true` | E2E / Integration | Token | `200 OK`, returns only active categories |
| `GET /categories/:id` | Unit & E2E | Existing ID | `200 OK`, returns Category |
| `GET /categories/:id` | Unit & E2E | Non-existent ID | `404 Not Found` |
| `PATCH /categories/:id` | E2E / Integration | Admin Token + Valid DTO | `200 OK`, returns updated Category |
| `DELETE /categories/:id` | Unit & E2E | Admin Token + Existing ID | Category updated to `active: false` |
