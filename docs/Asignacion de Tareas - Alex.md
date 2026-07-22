# Asignación de Tareas — Alex

Fecha: 2026-07-20
Fuente de reparto original: [Tabla de responsabilidades en Notion](https://app.notion.com/p/en-ruta/PROYECTO-38a02c98b216800ebf4fe9e0a769780e?source=copy_link)

## Contexto

El equipo repartió las tareas del sistema de Inventario Multi-Bodega por módulo (Service / Controller / Module / Tests). Alex puede tomar entre 13 y 14 tareas del pool sin asignar.

Estado previo del equipo (ya asignado):
- **Armando**: Categories (4, en curso/listo), Movement (4, sin empezar), Auth completo (6, listo/en curso) → 14 tareas
- **Giselle**: Provider (4)

Pool sin asignar antes de esta decisión (38 tareas): Product, Product Variant, Lot, Employee, SKU, Alert, Stock, Reservations, Analytics (9 módulos x 4), Docs README (1), PDF → Report Service opcional (1).

## Decisión: Alternativa B

Se descartó cargar los 3 módulos más críticos de negocio (SKU + Stock + Reservations) sobre una sola persona, ya que ahí se concentran los 4 retos de negocio de la rúbrica (PEPS, transacciones, transferencias, disponibilidad real) y eso desbalancea la responsabilidad frente al resto del equipo.

En su lugar, Alex toma un combo de complejidad media (Stock + Alert, dependientes entre sí) más un módulo de relación (Product Variant) y la documentación general:

| Módulo | Tareas | Motivo |
| --- | --- | --- |
| **Stock** | Service, Controller, Module, Tests (4) | Cubre "stock disponible real-time" (entrada - salidas - reservas), uno de los retos de negocio, pero sin cargar también PEPS ni Reservations |
| **Alert** | Service, Controller, Module, Tests (4) | Depende de Stock (compara contra `reorder_point` de product_variants); lógica más simple que PEPS/Reservations, buen complemento |
| **Product Variant** | Service, Controller, Module, Tests (4) | CRUD con relaciones (product, sku, alerts, reorder_point) — respiro entre los dos módulos anteriores |
| **Docs README.md** | 1 | Documentación general del proyecto |

**Total: 13 tareas**

## Queda pendiente de asignar a otros compañeros

- SKU (PEPS — el reto de negocio más técnico)
- Reservations (descuento de stock reservado)
- Product, Lot, Employee, Analytics
- PDF → Report Service (opcional)

## Siguiente paso

Confirmar con el resto del equipo quién toma SKU y Reservations, ya que junto con Movement (Armando) forman el núcleo de los retos de negocio de la rúbrica.
