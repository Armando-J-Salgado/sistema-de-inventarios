# Plan 03 — Colección Postman de flujos de negocio + README

> Plan autocontenido para ejecutar con un LLM. **Prerequisitos: Planes 00, 01 y 02 mergeados y `npm run seed` funcional** — la colección usa las credenciales y datos exactos del seeder (`docs/plans/02-seeders.md`). Entregable de rúbrica: "colección Postman con flujo de transferencia y despacho".

## Contexto de la API (verificar contra el código si algo no cuadra)

- Base URL: `http://localhost:3000` (sin prefijo global). Swagger en `/api`. Auth: `Authorization: Bearer <token>`.
- `POST /auth/login` `{ email, password }` → `{ access_token }`. Roles: ADMINISTRATOR, WAREHOUSE_MANAGER, ANALYST.
- Credenciales seed: `admin@inventory.com/Admin123!`, `manager.central@inventory.com/Manager123!`, `manager.norte@inventory.com/Manager123!`, `analyst@inventory.com/Analyst123!`.
- Datos seed relevantes: Bodega Central (cap 500, manager.central), Bodega Norte (cap 100, manager.norte); variantes `Cafe Molido Clasico` (reorderPoint 15) y `Descafeinado` (10); SKUs `CAFE-CLA-L1/L2`, `CAFE-DES-L1`, `CAFE-CLA-L3` (lote **PENDING**, remanente 50); una transferencia **IN_TRANSIT** Central→Norte (su `transferGroupId` lo imprime el seed); reserva ACTIVE de 10 sobre el stock de `CAFE-CLA-L2` en Central.
- Endpoints clave:
  - Movements (roles ADMINISTRATOR|WAREHOUSE_MANAGER, guards a nivel de clase): `POST /movements/entry` `{quantity, skuId, warehouseId, employeeId}` · `POST /movements/issue` `{quantity, productVariantId, warehouseId, employeeId}` (retorna **array** de movements, FEFO por bestBeforeDate) · `POST /movements/issue-from-reservation` `{employeeId, reservationId}` · `POST /movements/transfer` `{quantity, productVariantId, originWarehouseId, destinationWarehouseId, employeeId}` (array IN_TRANSIT + transferGroupId) · `POST /movements/transfer-from-reservation` `{employeeId, reservationId, destinationWarehouseId}` · `POST /movements/receive-transfer` `{transferGroupId, employeeId, decision: ACCEPT|REJECT}` · `GET /movements?type=&status=&warehouseId=&productVariantId=&transferGroupId=&dateFrom=&dateTo=` · `GET /movements/:id`.
  - Stocks (JWT): `GET /stocks` · `GET /stocks/available?variantId=&warehouseId=` · `GET /stocks/:id` · `GET /stocks/:id/available`. Disponible = físico − reservas ACTIVE vigentes.
  - Reservations (guards clase; escritura ADMINISTRATOR|WAREHOUSE_MANAGER, lectura + ANALYST; usa PUT): `POST /reservations` `{sourceStockId, quantity, fromDate, toDate}` · `GET /reservations` · `PUT /reservations/:id` · `DELETE /reservations/:id` (→ CANCELLED). WAREHOUSE_MANAGER solo su bodega.
  - Warehouses (Plan 01): CRUD con escritura ADMINISTRATOR, lectura JWT, PATCH.
  - Catálogo: `POST /categories` (ADMIN), `POST /products` (público, PUT para update), `POST /product-variants` (ADMIN), `POST /providers` (público), `POST /lots` (ADMIN), `POST /skus` (ADMIN, id string manual). GETs con JWT donde aplique.
  - `GET /alerts` (JWT) — alertas de reorden autogeneradas tras issues (Plan 00). `GET /analytics/need-reorder`, `GET /analytics/rotation/:productId`, `GET /analytics/top-moving?limit=` (ADMIN|ANALYST); `GET /warehouses/:warehouseId/analytics/...` (+ WAREHOUSE_MANAGER solo su bodega).
- Mensajes de error exactos para asserts negativos:
  - Lote no disponible (entry de SKU con lote PENDING): 400 `The sku belongs to lot with id {id} which is not available at the moment`
  - Capacidad bodega (entry): 400 `There is not enough capacity in the warehouse. Needs X spaces, only Y spaces remaining`
  - Permiso manager: 403 `The employee is not allowed to manage warehouse #{id}`
  - Issue insuficiente: 400 `Insufficient stock for product variant {id}: missing {n} units`
  - Reserva insuficiente: 400 `Insufficient stock. Requested: X, Available: Y`
  - Reserva de otra bodega (manager): 403 `You can only create reservations for your assigned warehouse`
  - Transfer group inexistente: 404 `No pending transfer found for group {uuid}`
  - Capacidad destino: 400 `Insufficient capacity in destination warehouse {id}: available X, needed Y`
  - Analytics de bodega ajena: 403 `Access denied to this warehouse analytics`
  - (Asserta con `pm.expect(json.message).to.include(...)` parcial, no igualdad estricta — Nest envuelve en `{statusCode, message, error}`.)

## Paso previo opcional

Si el entorno de ejecución lo permite, instalar skills de referencia de formato: `npx skills add postman-devrel/agent-skills@postman -g -y` y `npx skills add patricio0312rev/skills@postman-collection-generator -g -y`. Si no, generar el JSON directamente en formato **Postman Collection v2.1** (schema `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`).

## Entregables

1. `postman/sistema-inventarios.postman_collection.json`
2. `postman/local.postman_environment.json`
3. `README.md` actualizado (sección setup + uso de la colección)

## Environment (`local.postman_environment.json`)

Variables iniciales: `baseUrl=http://localhost:3000`, `adminEmail/adminPassword`, `managerCentralEmail/...`, `managerNorteEmail/...`, `analystEmail/...` (valores seed). Vacías (las llenan scripts): `adminToken`, `managerCentralToken`, `managerNorteToken`, `analystToken`, `centralWarehouseId`, `norteWarehouseId`, `clasicoVariantId`, `demoWarehouseId`, `demoCategoryId`, `demoProductId`, `demoVariantId`, `demoProviderId`, `demoLotId`, `demoSkuId`, `stockIdL2Central`, `reservationId`, `demoReservationId`, `transferGroupId`, `pendingTransferGroupId`, `availableBefore`, `stockBefore`, `skuQtyBefore`.

## Colección

- Nivel colección: `auth` tipo bearer con `{{adminToken}}` como default; requests que necesiten otro rol lo sobreescriben. Descripción de colección: resumen del flujo y prerequisito `npm run seed -- --fresh`.
- **Cada request** lleva: descripción de negocio (qué demuestra), `pm.test` de status code y aserciones de negocio. IDs encadenados con `pm.environment.set` en el test script del request que los produce.
- Diseñada para correr completa **en orden** con Collection Runner o Newman, partiendo de un seed fresco.
- Requests de descubrimiento inicial (folder 00) resuelven IDs reales consultando la API (no hardcodear IDs del seed: `GET /warehouses` y buscar por nombre; `GET /product-variants` por nombre; `GET /movements?status=IN_TRANSIT` para el `pendingTransferGroupId`; `GET /reservations` para la reserva ACTIVE; `GET /stocks` para el stock de L2 en Central).

### Folders (orden de ejecución)

**00 · Auth y descubrimiento**
1. Login admin / manager central / manager norte / analyst (4 requests; test: 200 + token no vacío; guardan `*Token`).
2. Login credenciales malas → 401.
3. Descubrir IDs (requests GET descritos arriba; tests: encontrado + set de variables).

**01 · Bodegas — CRUD (demuestra Plan 01)**
1. `POST /warehouses` `{name: "Bodega Demo {{$timestamp}}", maximumCapacity: 50}` (admin) → 201, `availableCapacity == maximumCapacity`; set `demoWarehouseId`.
2. `GET /warehouses` → 200, array contiene la demo.
3. `GET /warehouses/:id` → 200, trae `administrator` (null) y `stocks`.
4. `PATCH` subir maximumCapacity a 80 → `availableCapacity` subió en 30.
5. Negativo: `POST` con token analyst → 403.
6. Negativo: `POST` mismo nombre → 409.
7. Negativo: `PATCH` bajar maximumCapacity a 0 con capacidad ocupada → 400 (usar la Bodega Norte, que tiene stock) — o sobre la demo tras nota: si demo no tiene stock, este negativo va contra Norte.
8. `DELETE` demo → soft delete; `GET /warehouses?active=false` la contiene.

**02 · Catálogo demo** (todo con admin; nombres con `{{$timestamp}}` para re-ejecutabilidad)
categoría → proveedor → producto → variante (reorderPoint 5) → lote RECEIVED → SKU `DEMO-{{$timestamp}}` (quantity 100, unitCost 9.99, bestBeforeDate +45d, dateOfEntry hoy). Tests: 201 y set de `demo*Id`. Nota: nombres de producto/proveedor solo letras y espacios (validación DTO) — usar sufijo tipo `Demo A`, o verificar el regex del DTO; si no admite números, generar sufijo alfabético en pre-request script.

**03 · Entradas (el SKU se descuenta, el stock se llena)**
1. `GET /skus/{{demoSkuId}}` → guardar `skuQtyBefore` (=100).
2. `POST /movements/entry` 40 unidades del SKU demo a Bodega Central (employeeId del manager central, token manager central) → 201; movement COMPLETED, `totalCost == 40 * 9.99`.
3. `GET /skus/{{demoSkuId}}` → quantity == `skuQtyBefore − 40` (**la entrada resta del SKU** — regla del spec).
4. `GET /stocks?` buscar stock del SKU demo en Central → quantity 40; set `demoStockId`.
5. Negativo: entry de `CAFE-CLA-L3` (lote PENDING) → 400 `...not available at the moment`.
6. Negativo: entry de 999 unidades a Bodega Norte (cap 100) → 400 `There is not enough capacity...`.
7. Negativo: entry a Central con `employeeId` del manager norte (token manager norte) → 403 `The employee is not allowed to manage warehouse...`.

**04 · Reservas y stock disponible (vendible ≠ físico)**
1. `GET /stocks/{{demoStockId}}/available` → 40; guardar `availableBefore`.
2. `POST /reservations` 15 sobre `demoStockId` (admin) → 201 ACTIVE; set `demoReservationId`.
3. `GET /stocks/{{demoStockId}}/available` → 25 (**bajó exactamente la reserva; el físico sigue 40** — chequear con `GET /stocks/:id`).
4. Negativo: reservar 26 más → 400 `Insufficient stock. Requested: 26, Available: 25`.
5. Negativo: manager norte reserva sobre stock de Central → 403 `You can only create reservations for your assigned warehouse`.
6. Negativo: analyst hace POST → 403.

**05 · Despacho (issue)**
1. `POST /movements/issue` 30 de la variante demo en Central (manager central) → 201; el disponible era 25: **debe fallar** … ⚠ ver nota: este es el escenario estrella pero como negativo: → 400 `Insufficient stock for product variant...: missing 5 units` (**el físico 40 alcanzaba; las reservas lo impiden** — describir esto en la descripción del request).
2. `POST /movements/issue` 20 → 201; array de movements; stock quedó 20, disponible 5.
3. FEFO multi-SKU: `POST /movements/issue` de la variante **Clasico** en Central por cantidad que cruce L1→L2 (consultar antes `GET /stocks/available?variantId={{clasicoVariantId}}&warehouseId={{centralWarehouseId}}` y calcular; el seed deja L1≈5 y L2=30 con 10 reservadas — un issue de 8 devuelve 2 movements: 5 de L1 + 3 de L2, orden por bestBeforeDate). Test: `length > 1` y suma de quantities == pedido.
4. `POST /movements/issue-from-reservation` sobre `demoReservationId` (manager central) → 201; `GET /reservations/{{demoReservationId}}` → COMPLETED; disponible del stock demo re-consultado coherente (físico bajó 15, reserva ya no descuenta).
5. `GET /alerts` → existe alerta de la variante demo (reorderPoint 5, disponible quedó ≤ 5 — generada automática por Plan 00). Test: array contiene alerta con esa variante.

**06 · Transferencias entre bodegas (flujo estrella de la rúbrica)**
1. `POST /movements/transfer` 5 de variante demo Central→Norte (manager central) → 201; tests: todos status `IN_TRANSIT`, `transferGroupId` presente (set), stock origen ya descontado (GET), stock destino aún 0 — **inventario en tránsito real**.
2. `GET /movements?transferGroupId={{transferGroupId}}` → los movements del grupo.
3. `POST /movements/receive-transfer` ACCEPT (manager **norte** — el permiso es del destino) → 200/201; movements COMPLETED; stock Norte sumó 5.
4. Segunda transfer de 3 → `receive-transfer` **REJECT** → movements REJECTED; **stock origen restaurado** (GET antes/después — reversión de la operación).
5. Recibir la transferencia IN_TRANSIT **del seed** (`pendingTransferGroupId`) con ACCEPT → cierre del pendiente histórico.
6. `POST /movements/transfer-from-reservation`: crear reserva nueva de 3 sobre stock demo, transferirla a Norte, recibirla — despacho de pedido con destino en otra bodega, reserva → COMPLETED.
7. Negativo: transfer de 9999 → 400 `Insufficient stock...` (**imposible dejar el origen en negativo**).
8. Negativo: `receive-transfer` con manager central (no es del destino) → 403.
9. Negativo: `receive-transfer` con UUID aleatorio `{{$guid}}` → 404 `No pending transfer found for group...`.

**07 · Trazabilidad, conciliación y reportes**
1. `GET /movements?warehouseId={{centralWarehouseId}}&dateFrom=...` filtros varios → 200, todos los resultados cumplen el filtro.
2. **Conciliación del invariante** (test de negocio final): `GET /movements?productVariantId={{demoVariantId}}` + `GET /stocks/{{demoStockId}}` → en el test script recomputar `entradas − issues − transf-out(COMPLETED|IN_TRANSIT) + transf-in(COMPLETED)` filtrando por el stock y comparar contra `stock.quantity`. `pm.expect(computed).to.eql(actual)` — la fórmula del spec verificada por la propia colección.
3. `GET /analytics/need-reorder` (analyst) → contiene la variante demo (stock < reorderPoint tras los issues).
4. `GET /analytics/rotation/{{demoProductId}}` (analyst) → consumo > 0 (Fix A del Plan 00).
5. `GET /warehouses/{{centralWarehouseId}}/analytics/top-moving` con token manager central → 200.
6. Negativo: mismo endpoint con token manager **norte** → 403 `Access denied to this warehouse analytics`.
7. Negativo: `GET /analytics/need-reorder` con token manager → 403 (solo ADMIN|ANALYST).

## README.md

Añadir/actualizar secciones (mantener lo existente):
1. **Setup**: `npm install`; `.env` con `DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, PORT, SECRET_KEY` (¡SECRET_KEY obligatoria — sin ella los JWT no verifican!); Postgres corriendo (la BD se crea/actualiza sola por `synchronize: true`); `npm run start:dev`; Swagger en `http://localhost:3000/api`.
2. **Seeders**: `npm run seed` / `npm run seed -- --fresh`; tabla de credenciales; qué datos deja (bodegas, catálogo, transferencia pendiente, reserva activa).
3. **Colección Postman**: importar `postman/sistema-inventarios.postman_collection.json` + `postman/local.postman_environment.json`; correr con Collection Runner en orden, o CLI:
   ```bash
   npx newman run postman/sistema-inventarios.postman_collection.json -e postman/local.postman_environment.json
   ```
   Prerequisito: API corriendo y seed fresco (`npm run seed -- --fresh`). Describir en 5-8 bullets los flujos que la colección demuestra (entradas que descuentan SKU, disponible vs físico, despacho FEFO, despacho desde reservación, transferencia in-transit con ACCEPT/REJECT y reversión, conciliación de historial, alertas de reorden, RBAC por rol y por bodega).

## Verificación (Definition of Done)

1. JSON de colección válido (importa en Postman sin errores; opcionalmente `npx newman run ... --dry-run` no existe: el run real es la validación).
2. Flujo completo: `npm run seed -- --fresh` → API arriba → `npx newman run ...` → **0 failed assertions**. Si algún assert falla por comportamiento real de la API distinto al descrito aquí, ajustar el assert al comportamiento real (verificándolo en el código) y anotar la discrepancia al final del run.
3. La colección es re-ejecutable tras `npm run seed -- --fresh` (los `{{$timestamp}}` evitan colisiones de nombres; los requests de descubrimiento no dependen de IDs fijos).
4. README actualizado y coherente con lo implementado.

## Commit

```
Feat: add Postman collection and seeders docs
```
