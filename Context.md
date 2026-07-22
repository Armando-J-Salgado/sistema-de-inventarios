# 📦 Inventory Management System Context

## Entities and Attributes

### Categories
- **PK** `id` (integer)
- `name` (string)
- `active` (boolean)

### Providers
- **PK** `id` (integer)
- `name` (string)
- `address` (string)
- `email` (string)
- `active` (boolean)

### Products
- **PK** `id` (integer)
- `name` (string)
- **FK** `category_id` → Categories
- **FK** `provider_id` → Providers
- `unit_of_measurement` (string)
- `active` (boolean)

### Product Variants
- **PK** `id` (integer)
- **FK** `product_id` → Products
- `name` (string)
- `description` (string)
- `reorder_point` (integer)
- `active` (boolean)

### Lots
- **PK** `id` (integer)
- **FK** `provider_id` → Providers
- `date_of_entry` (timestamp)
- `state` (string)

### SKUs
- **PK** `id` (string)
- **FK** `product_variant_id` → Product Variants
- **FK** `lot_id` → Lots
- `date_of_entry` (timestamp)
- `quantity` (integer)
- `unit_cost` (decimal)
- `best_before_date` (timestamp)
- `active` (boolean)

### Warehouses
- **PK** `id` (integer)
- `name` (string)
- `maximum_capacity` (integer)
- `available_capacity` (integer)
- **FK** `employee_id` → Employees
- `active` (boolean)

### Employees
- **PK** `id` (integer)
- `email` (string)
- `password` (string)
- `name` (string)
- `address` (string)
- `role` (string)
- `active` (boolean)

### Alerts
- **PK** `id` (integer)
- **FK** `product_variant_id` → Product Variants
- `title` (string)
- `description` (string)
- `date` (timestamp)

### Stocks
- **PK** `id` (integer)
- **FK** `skus_id` → SKUs
- **FK** `warehouse_id` → Warehouses
- `quantity` (integer)
- `active` (boolean)

### Reservations
- **PK** `id` (integer)
- **FK** `source_stock_id` → Stocks
- `quantity` (integer)
- `from_date` (timestamp)
- `to_date` (timestamp)
- `status` (string)

### Movements
- **PK** `id` (integer)
- **FK** `source_stock_id` → Stocks
- **FK** `destination_stock_id` → Stocks (nullable)
- `quantity` (integer)
- `type` (string)
- `status` (string)
- `date` (timestamp)
- `total_cost` (decimal)
- **FK** `reservation_id` → Reservations (nullable)

---

## 🔗 Relationships Overview
- **Categories ↔ Products**: One category has many products.
- **Providers ↔ Products / Lots**: Providers supply products and lots.
- **Products ↔ Product Variants**: One product can have multiple variants.
- **Product Variants ↔ SKUs / Alerts**: Variants generate SKUs and alerts.
- **Lots ↔ SKUs**: SKUs are tied to lots.
- **Warehouses ↔ Stocks / Employees**: Warehouses store stocks and are managed by employees.
- **Stocks ↔ Reservations / Movements**: Stocks can be reserved or moved.
- **Movements ↔ Reservations**: Movements may be linked to reservations.

---

This markdown context makes the schema **machine-readable** and highlights:
- Primary keys (PK)
- Foreign keys (FK) with relationships
- Nullable fields
- Latest features like timestamps and integer fields

## Roles for employees

- **ADMINISTRATOR**: `ADMINISTRATOR` is the result of employee.role, can access any function in the system
- **WAREHOUSE_MANAGER**: `WAREHOUSE_MANAGER` is the result of employee.role, can access functions related to movements or reservations related to his own warehouse. Cannot create, update or delete other entities not related to his own warehouse stock, movements or reservations. He does have permission to consume information (GET Methods).
- **ANALYST**: `ANALYST` is the result of employee.role. He has access to the analytics functions. Cannot operate create, updates or deletes in the rest of the system. He does have permission to consume information.