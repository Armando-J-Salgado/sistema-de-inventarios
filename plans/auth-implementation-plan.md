# Implementation Plan: Auth Module — TDD, Validations & Bug Fixes

> **Reference Spec:** [`specs/auth-test-spec.md`](../specs/auth-test-spec.md)
> **Target Files:** `src/auth/**`, `test/auth.e2e-spec.ts`

---

## Background & Context

The `Auth` module exposes a single endpoint `POST /auth/login` that validates employee credentials and returns a signed JWT. The current test files only contain boilerplate `it('should be defined')` stubs. This plan details every modification and test that must be written, following **Red → Green → Refactor** TDD order.

Two bugs are also addressed as part of this plan:

1. **`Employee.password` has `{ select: false }`** — the `findOne()` call in `validateEmployee` does not retrieve the password column, making `bcrypt.compare` always receive `undefined` and always return `false`.
2. **No inactive-employee check** — an inactive employee can currently authenticate successfully.

> **IMPORTANT:** Write the **failing tests first**. Then implement the fix/feature that makes them pass. Do NOT skip writing a failing test before writing code.

---

## Phase 1 — DTO Validation (`src/auth/dto/login.dto.ts`)

### Goal
Add `class-validator` decorators so NestJS's `ValidationPipe` can reject malformed request bodies at the HTTP layer.

### File: [MODIFY] `src/auth/dto/login.dto.ts`

**Changes required:**
- Import `IsEmail`, `IsNotEmpty`, `IsString` from `class-validator`.
- Decorate `email` with `@IsString()`, `@IsEmail()`, `@IsNotEmpty()`.
- Decorate `password` with `@IsString()`, `@IsNotEmpty()`.

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'example@mail.com', description: 'Email of the employee' })
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456Abc!', description: 'Password to be tested' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
```

---

## Phase 2 — Bug Fixes (`src/auth/auth.service.ts`)

### Bug 1: Password field not selected

**Problem:** `employee.password` is declared with `@Column({ select: false })` in the entity. The current `findOne({ where: { email } })` call does **not** explicitly select the password, so `employee.password` is `undefined` and `bcrypt.compare` never matches.

**Fix:** Change the query to use QueryBuilder with `addSelect` to explicitly include the password column.

```typescript
// BEFORE (broken)
const employee = await this.employeeRepo.findOne({ where: { email } });

// AFTER (fixed)
const employee = await this.employeeRepo
  .createQueryBuilder('employee')
  .addSelect('employee.password')
  .where('employee.email = :email', { email })
  .getOne();
```

### Bug 2: Inactive employee can authenticate

**Problem:** There is no check for `employee.active`. An inactive employee currently receives a valid JWT.

**Fix:** After fetching the employee, return `null` if the employee is inactive.

### Full fixed `validateEmployee` method

```typescript
async validateEmployee(email: string, pass: string): Promise<Employee | null> {
  const employee = await this.employeeRepo
    .createQueryBuilder('employee')
    .addSelect('employee.password')
    .where('employee.email = :email', { email })
    .getOne();

  if (!employee || !employee.active) return null;

  const passwordMatches = await bcrypt.compare(pass, employee.password);
  if (!passwordMatches) return null;

  return employee;
}
```

---

## Phase 3 — Unit Tests

### File: [MODIFY] `src/auth/auth.service.spec.ts`

**Setup:**
- Create a mock repository object with a jest mock for `createQueryBuilder` that returns a chainable builder mock (with `addSelect`, `where`, `getOne` as jest functions).
- Provide a mock `JwtService` with a spy on `sign`.
- Use `jest.spyOn(bcrypt, 'compare')` to control bcrypt results without real hashing.

**Test cases to implement:**

#### `describe('validateEmployee')`

| # | Test name | Setup | Expected |
|---|-----------|-------|----------|
| 1 | `should return the employee when credentials are valid` | `getOne` returns active employee; `bcrypt.compare` resolves `true` | Returns `Employee` object |
| 2 | `should return null when employee is not found` | `getOne` returns `null` | Returns `null` |
| 3 | `should return null when password does not match` | `getOne` returns active employee; `bcrypt.compare` resolves `false` | Returns `null` |
| 4 | `should return null when employee is inactive` | `getOne` returns employee with `active: false` | Returns `null` (bcrypt must NOT be called) |

#### `describe('login')`

| # | Test name | Setup | Expected |
|---|-----------|-------|----------|
| 5 | `should call jwtService.sign with correct payload` | Spy on `jwtService.sign`, call `login(employee)` | `sign` called with `{ sub: employee.id, email: employee.email, roles: employee.role }` |
| 6 | `should return an object with access_token` | `jwtService.sign` returns `'mock.token'` | Returns `{ access_token: 'mock.token' }` |

---

### File: [MODIFY] `src/auth/auth.controller.spec.ts`

**Setup:**
- Create a mock `AuthService` with jest functions for `validateEmployee` and `login`.
- Instantiate `AuthController` with the mocked service via `Test.createTestingModule`.

**Test cases to implement:**

#### `describe('login')`

| # | Test name | Setup | Expected |
|---|-----------|-------|----------|
| 1 | `should return access_token when credentials are valid` | `validateEmployee` returns a mock `Employee`; `login` returns `{ access_token: 'token' }` | Returns `{ access_token: 'token' }` |
| 2 | `should throw UnauthorizedException when validateEmployee returns null` | `validateEmployee` returns `null` | Throws `UnauthorizedException` with message `'Invalid credentials'` |
| 3 | `should call validateEmployee with email and password from DTO` | Any valid employee returned | `validateEmployee` was called with `loginDto.email`, `loginDto.password` |

---

## Phase 4 — E2E / Integration Tests

### File: [NEW] `test/auth.e2e-spec.ts`

**Database strategy:** Use **SQLite in-memory** (`better-sqlite3` is already installed) by overriding the TypeORM module in the test setup. This avoids needing a real PostgreSQL instance.

**Important module override approach:**

```typescript
const moduleFixture = await Test.createTestingModule({
  imports: [AuthModule],
})
  .overrideProvider(getRepositoryToken(Employee))
  .useValue(sqliteEmployeeRepository)  // OR use TypeOrmModule.forRoot override
  .compile();
```

> **Recommended approach:** Override `AppModule` but replace `TypeOrmModule.forRoot` with an SQLite in-memory config that registers only the `Employee` entity. Apply `ValidationPipe` on the test app instance.

```typescript
app = moduleFixture.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
await app.init();
```

**IMPORTANT:** `ValidationPipe` is **not** in `main.ts`. It MUST be applied with `app.useGlobalPipes()` here. Do NOT modify `main.ts`.

**Pre-test seeding:**
In `beforeAll`, inject the `Repository<Employee>` and insert test fixtures:

```typescript
// Active admin
{ email: 'admin@test.com', password: await bcrypt.hash('ValidPass1!', 10),
  name: 'Test Admin', role: 'ADMINISTRATOR', active: true, address: '123 St' }

// Inactive employee
{ email: 'inactive@test.com', password: await bcrypt.hash('ValidPass1!', 10),
  name: 'Inactive User', role: 'EMPLOYEE', active: false, address: '456 St' }
```

---

**Test cases to implement:**

#### `describe('POST /auth/login')`

**400 Bad Request — DTO Validation failures**

| # | Test name | Payload | Expected status |
|---|-----------|---------|----------|
| 1 | `should return 400 for empty body` | `{}` | `400` |
| 2 | `should return 400 for invalid email format` | `{ email: 'not-an-email', password: 'ValidPass1!' }` | `400` |
| 3 | `should return 400 for missing password field` | `{ email: 'admin@test.com' }` | `400` |
| 4 | `should return 400 for empty email string` | `{ email: '', password: 'ValidPass1!' }` | `400` |

**401 Unauthorized — Invalid credentials**

| # | Test name | Payload | Expected status |
|---|-----------|---------|----------|
| 5 | `should return 401 for wrong password` | `{ email: 'admin@test.com', password: 'WrongPass!' }` | `401` |
| 6 | `should return 401 for non-existent email` | `{ email: 'nobody@test.com', password: 'ValidPass1!' }` | `401` |
| 7 | `should return 401 for inactive employee` | `{ email: 'inactive@test.com', password: 'ValidPass1!' }` | `401` |

**201 Created — Successful login**

| # | Test name | Payload | Assertions |
|---|-----------|---------|------------|
| 8 | `should return 201 and access_token on valid login` | `{ email: 'admin@test.com', password: 'ValidPass1!' }` | Status `201`, body has `access_token` (string) |
| 9 | `should return JWT with correct payload claims` | Same valid login | Decode middle segment of token (base64), verify `sub`, `email`, `roles` are present |

---

## Summary of Files Modified / Created

| Action | File | Reason |
|--------|------|--------|
| MODIFY | `src/auth/dto/login.dto.ts` | Add `class-validator` decorators |
| MODIFY | `src/auth/auth.service.ts` | Fix `select: false` password bug; add inactive employee guard |
| MODIFY | `src/auth/auth.service.spec.ts` | Full unit test suite (6 test cases) |
| MODIFY | `src/auth/auth.controller.spec.ts` | Full unit test suite (3 test cases) |
| NEW | `test/auth.e2e-spec.ts` | Full E2E integration suite with SQLite in-memory (9 test cases) |

---

## Verification Checklist

- [ ] `npm run test` — all unit tests in `src/auth/` pass
- [ ] `npm run test:e2e` — all tests in `test/auth.e2e-spec.ts` pass
- [ ] `npm run test:cov` — `auth.service.ts` and `auth.controller.ts` reach 100% branch coverage
- [ ] Confirm the two bugs are fixed by observing: test #3 (wrong password) fails BEFORE the fix, passes AFTER; test #7 (inactive employee) fails BEFORE the inactive check is added, passes AFTER
