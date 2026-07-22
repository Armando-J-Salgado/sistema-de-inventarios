# Sistema de Inventario Multi-Bodega

API RESTful para administración de inventario en múltiples bodegas. Proyecto final del curso de APIs (ESEN).

## Stack

- [NestJS](https://nestjs.com/) 11 + TypeScript
- [TypeORM](https://typeorm.io/) 0.3 sobre PostgreSQL (`synchronize: true` en desarrollo — el esquema se deriva de las entidades en cada arranque, no hay migraciones)
- Autenticación con JWT (`@nestjs/passport` + `passport-jwt`) y autorización por rol (`@Roles` + `RolesGuard`)
- Documentación con Swagger (`@nestjs/swagger`)
- Validación de DTOs con `class-validator` / `class-transformer`
- Tests con Jest (unitarios) y Supertest (e2e)

## Modelo de dominio

```
Category → Product → ProductVariant → Sku (Sku también pertenece a un Lot, y el Lot a un Provider)
ProductVariant (reorderPoint) ──< Sku ──< Stock (quantity, warehouse) ──< Reservation (quantity, status)
                                                    └──< Movement (source/destination)
Employee administra una Warehouse
```

Un `Stock` es la cantidad de un `Sku` físicamente almacenada en una `Warehouse`. Sobre un `Stock` cuelgan `Reservation` (aparta cantidad) y `Movement` (entrada/salida/transferencia).

## Requisitos

- Node.js 18+
- PostgreSQL en ejecución (local o remoto)

## Variables de entorno

Copiar `.env.example` a `.env` y completar:

```
DB_HOST=""
DB_PORT=""
DB_USERNAME=""
DB_PASSWORD=""
DB_NAME=""
PORT=""
SECRET_KEY=""
```

`SECRET_KEY` no aparece en `.env.example` pero es **obligatoria**: firma y verifica los JWT (`AuthModule`, `JwtStrategy`). Sin ella los tokens quedan firmados con cadena vacía y no son verificables de forma segura.

## Instalación y arranque

```bash
npm install
npm run start:dev      # modo watch, requiere PostgreSQL accesible con las credenciales del .env
```

- `npm run build` — compila a `dist/` (`nest build`)
- `npm run start:prod` — corre el build compilado (`node dist/main`)

Con `synchronize: true`, TypeORM crea/actualiza las tablas automáticamente contra la base indicada en `.env` al arrancar — no hace falta correr migraciones.

## Documentación (Swagger)

Con el servidor corriendo: **http://localhost:$PORT/api**

Incluye los tags `categories`, `variants`, `stocks` y `alerts`, con los códigos de respuesta (200/201/400/401/403/404) documentados por endpoint. Las rutas protegidas exigen un Bearer token (`Authorization: Bearer <jwt>`), obtenido en `POST /auth/login`.

## Tests

```bash
npm test                       # suite completa (Jest, rootDir=src)
npm test -- stocks             # solo specs cuyo path matchea "stocks"
npm test -- -t "should be defined"
npm run test:cov               # cobertura (rúbrica exige ≥ 70%)
npm run test:e2e               # jest --config ./test/jest-e2e.json (requiere PostgreSQL vivo, AppModule completo)
```

Los módulos `product-variants`, `stocks` y `alerts` se construyeron con TDD estricto (spec en rojo antes de implementar) y tienen cobertura de línea >80% cada uno, ejecutable sin base de datos (repositorios de TypeORM mockeados con `getRepositoryToken`). El resto de módulos (`categories`, `auth`, etc.) es responsabilidad de otros integrantes del equipo.

## Módulos y endpoints

| Módulo | Endpoints | Notas |
| --- | --- | --- |
| `auth` | `POST /auth/login` | Devuelve JWT `{ sub, email, roles }` (`roles` es el rol único del empleado, no un arreglo) |
| `categories` | CRUD completo | Soft delete por `active`; filtro `?active=` en `findAll` |
| `product-variants` | `GET /product-variants`, `GET /product-variants/:id`, `POST`, `PATCH /:id`, `DELETE /:id` | `POST`/`PATCH`/`DELETE` requieren rol `ADMINISTRATOR`; `findAll` solo devuelve variantes activas |
| `stocks` | `GET /stocks`, `GET /stocks/:id`, `GET /stocks/:id/available`, `GET /stocks/available?variantId=&warehouseId=`, `PATCH /stocks/:id`, `DELETE /stocks/:id` | **Sin `POST /stocks`**: la fila de Stock la crea una entrada de `MovementService`, no este módulo. `DELETE` es baja excepcional (producto contaminado, siniestro), no el flujo de salida normal |
| `alerts` | `GET /alerts`, `GET /alerts/:id` | Solo lectura: las alertas se autogeneran vía `AlertsService.evaluateAndGenerate(variantId)`, invocado manualmente hasta que el equipo defina el evento `movement.created` |

## Reglas de negocio implementadas

- **Stock disponible en tiempo real** (`StocksService.getAvailable`): `quantity − Σ(reservas activas)`. Una reserva cuenta como activa si su `status` está en `ACTIVE_RESERVATION_STATUSES` (`src/stocks/constants.ts`) y su `toDate` no está en el pasado. El disponible nunca es negativo — sobre-reserva se clampa a `0`.
- **Disponible agregado por variante/bodega** (`StocksService.getAvailableByVariantWarehouse`): suma el disponible (ya clampado) de todos los `Stock` activos (no soft-deleted) de los `Sku` de esa variante; si se pasa `warehouseId` filtra a esa bodega. Variante sin SKUs o SKUs sin stock → `0`, sin lanzar excepción.
- **Alertas de reorden** (`AlertsService.evaluateAndGenerate`): genera una `Alert` cuando el disponible total de una variante activa es `<= reorderPoint` (frontera inclusiva; con `reorderPoint = 0` solo alerta al llegar a `0`). No duplica alertas para la misma variante si ya existe una generada en las últimas 24 horas. Variante inactiva → no genera; variante inexistente → `404`.

## Decisiones de equipo registradas

Ver [`docs/Plan de Implementacion - Alex.md`](docs/Plan%20de%20Implementacion%20-%20Alex.md) para el detalle de las costuras de integración con Movements/Reservations (Armando) y las decisiones pendientes/resueltas durante la implementación de `product-variants`, `stocks` y `alerts`.
