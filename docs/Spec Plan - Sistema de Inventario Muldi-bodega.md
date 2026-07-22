# 📦 Spec Plan - Sistema de Inventario (Nest.js + TypeORM + Swagger)

## Objetivo
Generar la estructura de módulos, entidades, servicios y controladores para un sistema de inventario con reglas de negocio definidas.  
Cada entidad tiene su propio módulo siguiendo la convención de `nest g resource`.  
Los métodos deben estar definidos pero retornar mocks (sin lógica real).

---

## Entidades y Módulos

### Category
- **category.entity.ts**
  - id (PK)
  - name
  - active
- **category.service.ts**
  - `findAll()` → retorna mock
  - `create()` → retorna mock
- **category.controller.ts**
  - Endpoints REST: `GET /categories`, `POST /categories`

### Product
- **product.entity.ts**
  - id (PK)
  - name
  - categoryId (FK → Category)
  - providerId (FK → Provider)
  - unitOfMeasurement
  - active
- **product.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **product.controller.ts**
  - Endpoints REST: `GET /products`, `POST /products`

### Provider
- **provider.entity.ts**
  - id (PK)
  - name
  - address
  - email
  - active
- **provider.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **provider.controller.ts**
  - Endpoints REST: `GET /providers`, `POST /providers`

### Lot
- **lot.entity.ts**
  - id (PK)
  - providerId (FK → Provider)
  - dateOfEntry
  - state
- **lot.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **lot.controller.ts**
  - Endpoints REST: `GET /lots`, `POST /lots`

### ProductVariant
- **product-variant.entity.ts**
  - id (PK)
  - productId (FK → Product)
  - name
  - description
  - reorderPoint
  - active
- **product-variant.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **product-variant.controller.ts**
  - Endpoints REST: `GET /variants`, `POST /variants`

### SKU
- **sku.entity.ts**
  - id (PK, string)
  - productVariantId (FK → ProductVariant)
  - lotId (FK → Lot)
  - dateOfEntry
  - quantity
  - unitCost
  - bestBeforeDate
  - active
- **sku.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **sku.controller.ts**
  - Endpoints REST: `GET /skus`, `POST /skus`

### Warehouse
- **warehouse.entity.ts**
  - id (PK)
  - name
  - maximumCapacity
  - availableCapacity
  - employeeId (FK → Employee)
  - active
- **warehouse.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **warehouse.controller.ts**
  - Endpoints REST: `GET /warehouses`, `POST /warehouses`

### Employee
- **employee.entity.ts**
  - id (PK)
  - email
  - password
  - name
  - address
  - role
  - active
- **employee.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **employee.controller.ts**
  - Endpoints REST: `GET /employees`, `POST /employees`

### Alert
- **alert.entity.ts**
  - id (PK)
  - skuId (FK → SKU)
  - title
  - description
  - date
- **alert.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **alert.controller.ts**
  - Endpoints REST: `GET /alerts`, `POST /alerts`

### Inventory
- **inventory.entity.ts**
  - id (PK)
  - warehouseId (FK → Warehouse)
  - skuId (FK → SKU)
  - quantity
  - active
- **inventory.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **inventory.controller.ts**
  - Endpoints REST: `GET /inventories`, `POST /inventories`

### Movement
- **movement.entity.ts**
  - id (PK)
  - sourceInventoryId (FK → Inventory)
  - destinationInventoryId (FK → Inventory, nullable)
  - quantity
  - type (ENTRY/EXIT/TRANSFER)
  - status
  - date
  - totalCost
  - reservationId (FK → Reservation, nullable)
- **movement.service.ts**
  - `createEntry()` → mock
  - `createExit()` → mock
  - `createTransfer()` → mock
  - `revertMovement()` → mock
- **movement.controller.ts**
  - Endpoints REST: `POST /movements/entry`, `POST /movements/exit`, `POST /movements/transfer`, `POST /movements/revert/:id`

### Reservation
- **reservation.entity.ts**
  - id (PK)
  - inventoryId (FK → Inventory)
  - quantity
  - fromDate
  - toDate
  - status (ACTIVA, COMPLETADA, CANCELADA)
- **reservation.service.ts**
  - `findAll()` → mock
  - `create()` → mock
- **reservation.controller.ts**
  - Endpoints REST: `GET /reservations`, `POST /reservations`

---

## Common Services

### CostCalculatorFIFO
- **cost-calculator-fifo.service.ts**
  - `calculateCost(sku: Sku, quantity: number): number` → retorna mock

---

## Analytics
- **analytics.service.ts**
  - `calculateRotation(productId: number): number` → mock
  - `topMovingProducts(): Product[]` → mock
  - `coverageDays(skuId: string): number` → mock
- **analytics.controller.ts**
  - Endpoints REST: `GET /analytics/rotation/:productId`, `GET /analytics/top-moving`, `GET /analytics/coverage/:skuId`

---

## Eventos
- **movement.listener.ts**
  - `@OnEvent('movement.created')` → llama a `AnalyticsService` y `AlertService` con mocks

---

## Notas
- Todos los métodos deben retornar valores simulados (`return { message: 'mock response' };`).  
- DTOs deben incluir validaciones (`class-validator`) pero sin lógica interna.  
- Swagger ya está configurado en `app.module.ts`, por lo que los decoradores `@ApiTags`, `@ApiResponse` deben estar presentes en controladores.