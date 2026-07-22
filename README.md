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

## Seeders

```bash
npm run seed              # solo siembra si no existe ya un admin@inventory.com
npm run seed -- --fresh   # TRUNCATE de todas las tablas + siembra completa desde cero
```

`npm run seed -- --fresh` es el prerequisito de la colección Postman (abajo): deja datos deterministas para que los flujos de negocio y la conciliación de inventario sean reproducibles.

Credenciales que deja el seed:

| Rol | Email | Password |
| --- | --- | --- |
| `ADMINISTRATOR` | `admin@inventory.com` | `Admin123!` |
| `WAREHOUSE_MANAGER` (Bodega Central) | `manager.central@inventory.com` | `Manager123!` |
| `WAREHOUSE_MANAGER` (Bodega Norte) | `manager.norte@inventory.com` | `Manager123!` |
| `ANALYST` | `analyst@inventory.com` | `Analyst123!` |

Datos que deja el seed:

- **Bodegas**: Bodega Central (capacidad 500, administrada por manager.central) y Bodega Norte (capacidad 100, administrada por manager.norte).
- **Catálogo**: categoría "Bebidas", proveedor "Distribuidora El Salvador", producto "Cafe Molido" con variantes "Cafe Molido Clasico" (reorderPoint 15) y "Cafe Molido Descafeinado" (reorderPoint 10).
- **Lotes y SKUs**: dos lotes `RECEIVED` (L1, L2) y uno `PENDING` (L3); SKUs `CAFE-CLA-L1`, `CAFE-CLA-L2`, `CAFE-CLA-L3` (del lote PENDING, remanente 50) y `CAFE-DES-L1`.
- **Movimientos**: entradas de esos SKUs a ambas bodegas, un issue, una transferencia Central→Norte ya `COMPLETED` y otra `IN_TRANSIT` (pendiente de recibir).
- **Reserva**: una reserva `ACTIVE` de 10 unidades sobre el stock de `CAFE-CLA-L2` en Bodega Central.

Al final imprime en consola un resumen con los IDs generados (bodegas, variantes, lotes, stock, transferGroupIds, reserva) para depuración manual.

## Colección Postman

`postman/sistema-inventarios.postman_collection.json` + `postman/local.postman_environment.json` cubren el entregable de rúbrica "colección Postman con flujo de transferencia y despacho".

**Prerequisito**: API corriendo (`npm run start:dev`) y seed fresco (`npm run seed -- --fresh`) — la colección depende de los datos deterministas del seed y de los `$timestamp` de Postman para ser re-ejecutable sin colisionar.

Importar ambos archivos en Postman y correr la colección completa **en orden** con el Collection Runner, o por CLI con Newman:

```bash
npx newman run postman/sistema-inventarios.postman_collection.json -e postman/local.postman_environment.json
```

La colección resuelve sus propios IDs contra la API (folder `00 - Auth y descubrimiento`: busca bodegas/variantes/empleados por nombre o email) en vez de hardcodear IDs del seed, así que sobrevive a un `--fresh` repetido.

Flujos que demuestra, folder por folder:

1. **Auth y RBAC**: login de los 4 roles, credenciales inválidas, resolución de IDs de empleados/bodegas/variantes.
2. **Bodegas (CRUD)**: alta con `availableCapacity == maximumCapacity`, actualización de capacidad, conflicto de nombre duplicado, baja lógica y negativos de rol/capacidad.
3. **Entradas**: la entrada resta del SKU y suma al stock de la bodega; negativos de lote `PENDING`, capacidad excedida y permiso de bodega ajena.
4. **Disponible vs físico**: una reserva baja el disponible sin tocar la cantidad física del stock; negativos de sobre-reserva y de reservar en bodega ajena.
5. **Despacho FEFO y por reservación**: un issue que el físico alcanzaría pero las reservas activas bloquean; despacho FEFO cruzando de un SKU a otro por fecha de vencimiento; despacho que cierra una reservación; alerta de reorden autogenerada.
6. **Transferencias entre bodegas**: inventario `IN_TRANSIT` real (se descuenta el origen al crear, no al recibir), `ACCEPT`/`REJECT` con reversión del stock de origen al rechazar, permiso de recepción validado contra la bodega destino, y despacho a otra bodega vía reservación.
7. **Trazabilidad y analytics**: filtros de `GET /movements`, conciliación del invariante de inventario (recomputa el historial de movimientos y lo compara contra el stock actual), `need-reorder`, `rotation`, `top-moving` por bodega y sus restricciones de rol/bodega.

### Discrepancias encontradas al verificar el plan contra el código

- `POST /products` y `POST /providers` son *stubs* en memoria (arrays privados en `ProductsService`/`ProvidersService`), desconectados de las tablas reales `product`/`provider` que `ProductVariantsService` y `LotsService` sí consultan vía TypeORM. La colección los invoca (cubren el endpoint público del rubro) pero para encadenar IDs reutiliza el producto y proveedor del seed (`id 1` tras `--fresh`, únicas filas insertadas antes de correr la colección).
- `GET /stocks` y `GET /stocks/:id` no cargan relaciones (`sku`/`warehouse` ausentes en la respuesta), así que no permiten "buscar" un stock por SKU/bodega como asumía el plan original. La colección obtiene los IDs de stock directamente de las respuestas de movimientos, que sí traen `sourceStock`/`destinationStock` completos.
- Ningún controller usa `@HttpCode`, así que el runtime no siempre coincide con lo documentado en Swagger: los `POST /movements/issue-from-reservation`, `transfer-from-reservation` y `receive-transfer` (documentados como 200) en realidad devuelven **201**; los `DELETE` documentados como 203 devuelven **200**. La colección asume el comportamiento real.
- `GET /analytics/need-reorder` compara el stock físico total contra `reorderPoint` con `<` estricto (no `<=`, que sí usa la generación de alertas de `/alerts`). Se ajustó la cantidad despachada en la sección 05 para que el físico total de la variante demo quede en 4 unidades, no en 5, y así aparezca en el reporte.
- El paso de "segunda transferencia" de la sección 06 usa la variante Clasico del seed (la variante demo queda en 0 físico en Central tras la primera transferencia completa), y el flujo de `transfer-from-reservation` opera sobre el stock demo que terminó en Bodega Norte, devolviéndolo a Central.

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
