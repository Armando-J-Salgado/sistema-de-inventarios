# Tarea: crear la colección de Postman de flujos de negocio y corregir Warehouses

## Contexto

- Aprovechando la creación de la colección de Postman, se espera también utilizar seeders para poder probar la API de manera más sencilla.
  - Para crear los seeders de Movement con una lógica adecuada, se requiere considerar lo siguiente: cuándo se crea un Movement, del SKU se restan los items para rellenar los stocks. Luego, los stocks deben verse reflejados en el historial de movimiento (la cantidad total acumulada debe ser igual a las entradas, salidas y transferencias). Para ser más especifico, stock = entradas - salidas + transferencias completadas de entrada - transferencias completadas de salida. Las reservas en suma no deben superar el stock.
Al hacer un movimiento de entrada se resta la cantidad del SKU
- El CRUD de bodegas no ha sido completamente implementado con lo que se solicita en la rúbrica, por lo que se requiere completar eso, dado que es un espacio en el proyecto que hace falta.

## Alcance

- Los cambios deben mostrarse ÚNICAMENTE en los módulos relacionados al contexto (Movements, Seeders, Warehouses, etc.) y NO deben afectar la estructura base del proyecto.

## Definition of Done

- El proyecto debe ser capaz de correr sin errores
- Los seeders de Movement deben seguir la lógica indicada en el contexto y deben ser capaces de generar movimientos que permitan probar la API de manera más sencilla.
- El CRUD de bodegas debe estar completamente implementado con lo que se solicita en la rúbrica.
- El README.md debe estar actualizado con los cambios y que por medio de este se pueda indicar el setup del proyecto y el uso de la colección de Postman.
- La colección de Postman debe de estar creada y contener los flujos de negocio que se puedan probar, garantizando su funcionalidad completa.