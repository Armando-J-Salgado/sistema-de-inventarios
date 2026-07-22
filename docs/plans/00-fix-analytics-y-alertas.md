# Plan 00 — Fixes mínimos: Analytics (type EXIT) y Alertas automáticas

> Plan autocontenido para ejecutar con un LLM. No requiere planes previos. Es prerequisito lógico de los planes 02 (seeders) y 03 (colección Postman), que asumen estos fixes hechos.

## Contexto del repo (léelo antes de tocar nada)

- Proyecto NestJS 11 + TypeORM 0.3 + Postgres (`synchronize: true`, sin migraciones) en la raíz `sistema-de-inventarios/`.
- `ValidationPipe({ whitelist: true, transform: true })` global en `src/main.ts`.
- Enums de movimientos en `src/enums/movement-type.enum.ts`:
  - `MovementType`: `ENTRANCE`, `ISSUE`, `ISSUE_FROM_RESERVATION`, `TRANSFER`, `TRANSFER_FROM_RESERVATION`
  - `MovementStatus`: `COMPLETED`, `IN_TRANSIT`, `REJECTED`
- **No existe el type `EXIT` en ninguna parte del dominio** — es un resto de una versión vieja del spec.
- Tests: `npm test` (jest, rootDir=src, specs `*.spec.ts` junto al código). Build: `npm run build`. Lint: `npm run lint`.
- NO tocar `src/events/movement.listener.ts` (otro compañero trabaja en él).
- Alcance estricto: solo los archivos listados abajo + sus specs. No refactorizar nada más.

## Problema

1. **Fix A**: los repositorios de analytics filtran `movement.type = 'EXIT'`, type que no existe. Resultado: rotación, top-moving y coverage siempre devuelven 0 consumo.
2. **Fix B**: `AlertsService.evaluateAndGenerate(...)` (en `src/alerts/alerts.service.ts`) genera alertas de reorden cuando `disponible <= reorderPoint` de la variante, con deduplicación de 24h — pero **nadie lo llama desde código de producción** (solo specs). Las alertas nunca se generan.

## Fix A — Analytics

Ocurrencias exactas de `'EXIT'` (6 en total, verifica con grep antes de editar):

- `src/analytics/repositories/global-analytics.repository.ts` líneas ~42, ~71, ~106
- `src/analytics/repositories/warehouse-analytics.repository.ts` líneas ~55, ~88, ~130

Cambio en cada una: reemplazar el filtro por los types reales de **consumo** (las transferencias mueven, no consumen — NO incluirlas):

```ts
// antes
.andWhere("movement.type = 'EXIT'")
// después
.andWhere('movement.type IN (:...consumptionTypes)', {
  consumptionTypes: [MovementType.ISSUE, MovementType.ISSUE_FROM_RESERVATION],
})
```

- Importar `MovementType` desde `src/enums/movement-type.enum.ts` (imports absolutos `src/...` es la convención del repo).
- En cada query donde no esté ya filtrado, añadir también `movement.status = :status` con `MovementStatus.COMPLETED` (no contar movimientos IN_TRANSIT/REJECTED como consumo).
- Ojo con `.where(...)` vs `.andWhere(...)`: en las líneas ~71/~88 el filtro EXIT es el `.where` inicial — conserva la estructura del query builder.

## Fix B — Alertas automáticas

Archivo: `src/movements/movements.service.ts`. El service delega en estrategias vía `MovementStrategyFactory`; los métodos que **reducen stock en una bodega** y por tanto deben evaluar alerta después de ejecutarse:

| Método | DTO | Cómo obtener `productVariantId` |
|---|---|---|
| `createIssue` | `CreateIssueDto` | `dto.productVariantId` directo |
| `createTransfer` | `TransferMovementDto` | `dto.productVariantId` directo |
| `createIssueFromTransfer` (endpoint issue-from-reservation) | `IssueFromReservationDto` | resolver vía reservation (ver abajo) |
| `createTransferFromReservation` | `TransferFromReservationDto` | resolver vía reservation |

`createEntry` y `receiveTransfer` NO evalúan alerta (entrada sube stock; receive no baja stock del origen — ya bajó al crear la transfer).

### Implementación

1. En `src/movements/movements.module.ts`: añadir `AlertsModule` a `imports` (ya existe y **ya exporta `AlertsService`** — verifica en `src/alerts/alerts.module.ts`). Revisa que no se cree dependencia circular (AlertsModule importa StocksModule; StocksModule no importa MovementsModule — confirma con un vistazo).
2. Inyectar `AlertsService` en el constructor de `MovementsService`.
3. Para los flujos de reservación, inyectar `Repository<Reservation>` (la entity ya está en el `forFeature` de `MovementsModule`) y cargar la reserva con `relations: { stock: { sku: { productVariant: true } } }` para obtener el `productVariant.id`. Verifica los nombres exactos de las relaciones en `src/reservations/entities/reservation.entity.ts` y `src/stocks/entities/stock.entity.ts` (stock → `sku` → `productVariant`).
4. Patrón por método (los métodos hoy retornan la promesa de la estrategia directamente — conviértelos en `async` para poder encadenar):

```ts
async createIssue(dto: CreateIssueDto) {
  const result = await this.strategyFactory.make(MovementType.ISSUE).execute(dto);
  await this.tryEvaluateAlert(dto.productVariantId);
  return result;
}

private async tryEvaluateAlert(variantId: number): Promise<void> {
  try {
    await this.alertsService.evaluateAndGenerate(variantId);
  } catch (error) {
    // una alerta fallida no debe romper el movimiento
    console.error(`Alert evaluation failed for variant ${variantId}:`, error);
  }
}
```

- **Verifica la firma real** de `evaluateAndGenerate` en `src/alerts/alerts.service.ts` antes de asumir `(variantId: number)`.
- La llamada va DESPUÉS de que la estrategia terminó (fuera de su transacción interna) y envuelta en try/catch.
- La deduplicación de 24h ya vive dentro de `AlertsService` — no reimplementar.
- Para transfer: evalúa la alerta con el variantId del origen (el stock que bajó).

## Tests

- Ajustar/crear specs mínimos (mismo estilo del repo: `Test.createTestingModule` con mocks vía `getRepositoryToken`, ver `src/stocks/stocks.service.spec.ts` o `src/alerts/*.spec.ts` como referencia):
  - Analytics repository/service: el filtro usa ISSUE + ISSUE_FROM_RESERVATION (puede bastar testear a nivel service con mock del query builder o del repository, según cómo estén estructurados los specs existentes de analytics).
  - MovementsService: al ejecutar `createIssue`, se llama `alertsService.evaluateAndGenerate` con el variantId del DTO; si `evaluateAndGenerate` lanza, `createIssue` NO propaga el error y retorna el movimiento.
- Los specs existentes de movements probablemente instancian `MovementsService` con providers mockeados — al añadir `AlertsService` y `Repository<Reservation>` al constructor, **actualiza esos specs** con los mocks nuevos o fallarán por DI.

## Definition of Done

- 0 ocurrencias de `'EXIT'` en `src/` (grep limpio).
- Todo movimiento de issue/transfer (directo o desde reservación) dispara `evaluateAndGenerate` exactamente una vez, tolerante a fallos.
- `npm run build`, `npm run lint`, `npm test` en verde (incluidos specs preexistentes ajustados).

## Commit

```
Fix: analytics consumption types and auto-generate reorder alerts
```

(estilo del repo: prefijo `Fix:`/`Feat:` + descripción corta en inglés)
