<div align="center">

# ESEN — Escuela Superior de Economía y Negocios Diseño y Desarrollo de APIs

</div>

Rúbricas de Funcionalidades — Proyectos Finales

17 propuestas de proyectos con reto de negocio de alto estándar

## Instrucciones generales

Cada equipo deberá desarrollar una API RESTful completa para el proyecto asignado. La evaluación considera tres dimensiones: (1) correcto funcionamiento de todas las funcionalidades requeridas, (2) solidez del diseño técnico y cobertura de pruebas, y (3) profundidad en la solución de los retos de negocio. Todos los proyectos comparten los mismos elementos técnicos obligatorios.

<div align="center">

04. Sistema de Inventario Multi-Bodega

</div>

<table border="1"><tr><td>Sector</td><td>Logística / Operaciones</td></tr><tr><td>Objetivo general</td><td>Construir una API que controle el stock de productos en múltiples almacenes, registre todos los movimientos con trazabilidad completa y emita alertas automáticas de reorden.</td></tr><tr><td>Descripción</td><td>Backend para empresas distribuidoras o manufactureras que operan con múltiples puntos de almacenamiento y necesitan visibilidad en tiempo real del inventario disponible, reservado y en tránsito.</td></tr></table>

## Funcionalidades requeridas de la API

<table border="1"><tr><td>CRUD de productos con SKU, categoría, unidad de medida y precio de costo</td></tr><tr><td>CRUD de bodegas con capacidad máxima y responsable</td></tr><tr><td>Registro de movimientos: entradas, salidas, transferencias entre bodegas</td></tr><tr><td>Stock disponible por producto/bodega en tiempo real (entrada - salidas - reservas)</td></tr><tr><td>Reserva de stock para pedidos pendientes de despacho</td></tr><tr><td>Configuración de punto de reorden por producto; alerta cuando el stock cae por debajo</td></tr><tr><td>Valorización de inventario por método PEPS (Primero en Entrar, Primero en Salir)</td></tr><tr><td>Reporte de movimientos por período con saldo inicial y final</td></tr></table>

## Retos de negocio a resolver

- Implementar PEPS correctamente usando las entradas ordenadas por fecha para calcular el costo de cada salida

- Garantizar consistencia del stock bajo operaciones concurrentes usando transacciones de BD

- Impedir transferencias que dejen el stock de origen en negativo

- Calcular el stock disponible real descontando las unidades reservadas por pedidos abiertos

## Elementos técnicos obligatorios

- Autenticación con JWT y rutas protegidas por rol

- Validación de datos de entrada con DTOs y class-validator

- Manejo estructurado de errores con HTTP Exceptions

- Pruebas unitarias y funcionales con Jest/Supertest (mínimo 70% cobertura)

- Documentación de endpoints con Swagger/OpenAPI

- Base de datos relacional con TypeORM o Prisma (mínimo 3 entidades relacionadas)

- Transacciones de base de datos para movimientos de inventario

- Índices en SKU y combinación producto-bodega para consultas eficientes

<table border="1"><tr><td>Entregable esperado</td><td>API con Swagger, colección Postman con flujo de transferencia y despacho, reporte de pruebas con cobertura de la lógica PEPS.</td></tr></table>