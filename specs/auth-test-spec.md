# Specification Plan: Auth Module Testing & Validation (TDD)

## Overview
This specification plan guides an AI assistant (or developer) to implement comprehensive **Unit Tests**, **Integration (E2E) Tests**, and **DTO Validations** for the `Auth` module (`src/auth`).

The `Auth` module handles employee authentication via `POST /auth/login` and issues JWT tokens containing claims (`sub`, `email`, `roles`).

---

## 1. Scope & Objectives
1. **DTO Validation Enhancements**: Add `class-validator` and `class-transformer` rules to `LoginDto` (`src/auth/dto/login.dto.ts`).
2. **Unit Testing (`src/auth/*.spec.ts`)**:
   - `AuthService`: Mock TypeORM `Repository<Employee>` and `JwtService`. Test login validation, password comparison via `bcrypt`, token creation, and non-existent/invalid user handling.
   - `AuthController`: Mock `AuthService`. Test handling of valid credentials and throwing `UnauthorizedException` for invalid credentials.
3. **Integration / E2E Testing (`test/auth.e2e-spec.ts`)**:
   - Test `POST /auth/login` endpoint using `supertest` with NestJS `ValidationPipe` active.
   - Test 400 Bad Request responses when payload fails DTO validation.
   - Test 401 Unauthorized responses for invalid credentials.
   - Test 201 Created responses returning valid JWT tokens upon successful login.

---

## 2. Technical Analysis & Discovered Gaps

### Existing Codebase Assessment
- **`LoginDto`**: Contains `@ApiProperty()` annotations but lacks `class-validator` rules like `@IsEmail()` or `@IsNotEmpty()`.
- **`AuthService.validateEmployee`**: Uses `bcrypt.compare`. Returns `null` when user is missing or password mismatch occurs.
- **`AuthService.login`**: Issues JWT signed payload containing `{ sub: employee.id, email: employee.email, roles: employee.role }`.
- **Current Tests**: Only contain basic `it('should be defined')` assertions.

---

## 3. Required Modifications (TDD Implementation Order)

### Phase 1: DTO Validation Layer (`src/auth/dto/login.dto.ts`)
- **Fields to Validate**:
  - `email`: Must be a non-empty, valid email string (`@IsEmail()`, `@IsNotEmpty()`, `@IsString()`).
  - `password`: Must be a non-empty string (`@IsString()`, `@IsNotEmpty()`).

### Phase 2: Unit Testing (`src/auth`)
#### `AuthService` Unit Tests (`src/auth/auth.service.spec.ts`)
- **`validateEmployee(email, password)`**:
  - Should return `Employee` entity (without password in plain text if omitted, or standard entity) when email exists and `bcrypt.compare` returns `true`.
  - Should return `null` when employee email is not found in repository.
  - Should return `null` when password does not match `bcrypt.compare`.
  - Should handle inactive employees (if status check required).
- **`login(employee)`**:
  - Should call `JwtService.sign` with `{ sub: employee.id, email: employee.email, roles: employee.role }`.
  - Should return an object formatted as `{ access_token: string }`.

#### `AuthController` Unit Tests (`src/auth/auth.controller.spec.ts`)
- **`login(loginDto)`**:
  - Should return `{ access_token }` when `authService.validateEmployee` returns a valid employee.
  - Should throw `UnauthorizedException('Invalid credentials')` when `authService.validateEmployee` returns `null`.
  - Should ensure `validateEmployee` is called with exact `email` and `password` from the DTO.

### Phase 3: Integration / E2E Testing (`test/auth.e2e-spec.ts`)
- **Suite Setup**:
  - Initialize NestJS testing module with `ValidationPipe({ whitelist: true })`.
  - Override or mock database dependencies/seed test employee with hashed password.
- **Scenarios to Test**:
  - **`POST /auth/login` - 400 Bad Request**:
    - Empty request body (`{}`).
    - Malformed email string (e.g. `invalid-email`).
    - Missing `password` field.
    - Non-string `password` field.
  - **`POST /auth/login` - 401 Unauthorized**:
    - Registered email with incorrect password.
    - Unregistered email address.
  - **`POST /auth/login` - 201 Created**:
    - Valid email and password payload.
    - Response contains `access_token`.
    - Decoding the token reveals valid claims (`sub`, `email`, `roles`).

---

## 4. Test Matrix & Verification Checklist

| Target | Test Type | Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `LoginDto` | DTO Validation | Invalid email format | `400 Bad Request` with validation error messages |
| `LoginDto` | DTO Validation | Missing password field | `400 Bad Request` with validation error messages |
| `AuthService` | Unit Test | User found & hash matches | Returns `Employee` object |
| `AuthService` | Unit Test | User not found | Returns `null` |
| `AuthService` | Unit Test | Hash mismatch | Returns `null` |
| `AuthService` | Unit Test | `login()` execution | Calls `jwtService.sign` with payload `{ sub, email, roles }` |
| `AuthController` | Unit Test | Valid login credentials | Returns `{ access_token }` |
| `AuthController` | Unit Test | Invalid login credentials | Throws `UnauthorizedException` |
| `POST /auth/login` | E2E Integration | Full valid login flow | `201 Created`, returns JWT token |
| `POST /auth/login` | E2E Integration | Invalid credentials flow | `401 Unauthorized` |
