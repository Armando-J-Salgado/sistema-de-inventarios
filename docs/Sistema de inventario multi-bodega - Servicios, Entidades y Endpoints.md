"""
# 📦 Sistema de Inventario – Servicios, Entidades y Endpoints

## ⚙️ MovementService
Encapsula la lógica de negocio de movimientos de inventario.

+ createEntry(dto: CreateEntryDto): Movement
+ createExit(dto: CreateExitDto): Movement
+ createTransfer(dto: CreateTransferDto): Movement
+ revertMovement(id: number): void

### DTOs requeridos
- **CreateEntryDto**
  - skuId: string
  - inventoryId: number
  - quantity: number
  - unitCost: decimal
  - dateOfEntry: Date
- **CreateExitDto**
  - skuId: string
  - inventoryId: number
  - quantity: number
  - customerId: number (opcional)
- **CreateTransferDto**
  - sourceInventoryId: number
  - destinationInventoryId: number
  - skuId: string
  - quantity: number
- **RevertMovement**
  - id: number (identificador del movimiento en tránsito)

---

## 📊 AnalyticsService
Calcula métricas y estadísticas del inventario.

+ calculateRotation(productId: number): number
+ topMovingProducts(): Product[]
+ coverageDays(skuId: string): number

### DTOs requeridos
- **calculateRotation**
  - productId: number
- **topMovingProducts**
  - (sin parámetros, retorna lista)
- **coverageDays**
  - skuId: string

---

## 🚫 Entidades sin CRUD completo
Estas entidades no tendrán controladores CRUD estándar porque su comportamiento está gobernado por los servicios anteriores:

- **Movement**
  - No CRUD completo: los movimientos solo se crean a través de `MovementService`.
- **Reservation**
  - No CRUD completo: las reservas se gestionan en relación con movimientos y stock.
- **Alert**
  - No CRUD completo: las alertas se generan automáticamente por `AlertService` y `AnalyticsService`.

---

# 🌐 Endpoints Nest.js Clásicos

## CategoryModule
GET /categories
GET /categories/:id
POST /categories
PUT /categories/:id
DELETE /categories/:id

## ProductModule
GET /products
GET /products/:id
POST /products
PUT /products/:id
DELETE /products/:id

## ProviderModule
GET /providers
GET /providers/:id
POST /providers
PUT /providers/:id
DELETE /providers/:id

## LotModule
GET /lots
GET /lots/:id
POST /lots
PUT /lots/:id
DELETE /lots/:id

## ProductVariantModule
GET /variants
GET /variants/:id
POST /variants
PUT /variants/:id
DELETE /variants/:id

## SkuModule
GET /skus
GET /skus/:id
POST /skus
PUT /skus/:id
DELETE /skus/:id

## WarehouseModule
GET /warehouses
GET /warehouses/:id
POST /warehouses
PUT /warehouses/:id
DELETE /warehouses/:id

## EmployeeModule
GET /employees
GET /employees/:id
POST /employees
PUT /employees/:id
DELETE /employees/:id

## InventoryModule
GET /inventories
GET /inventories/:id
POST /inventories
PUT /inventories/:id
DELETE /inventories/:id

## MovementModule
POST /movements/entry
POST /movements/exit
POST /movements/transfer
POST /movements/revert/:id
GET /movements
GET /movements/:id

## ReservationModule
GET /reservations
GET /reservations/:id
POST /reservations
PUT /reservations/:id
DELETE /reservations/:id

## AlertModule
GET /alerts
GET /alerts/:id

## AnalyticsModule
GET /analytics/rotation/:productId
GET /analytics/top-moving
GET /analytics/coverage/:skuId
"""
ok ese es un resumen más ordenado de lo que puede cambiar