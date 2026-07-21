import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { DataSource } from 'typeorm';

import { Category } from '../src/categories/entities/category.entity';
import { Provider } from '../src/providers/entities/provider.entity';
import { Product } from '../src/products/entities/product.entity';
import { ProductVariant } from '../src/product-variants/entities/product-variant.entity';
import { Lot } from '../src/lots/entities/lot.entity';
import { Employee } from '../src/employees/entities/employee.entity';
import { Sku } from '../src/skus/entities/skus.entity';
import { Alert } from '../src/alerts/entities/alert.entity';
import { Stock } from '../src/stocks/entities/stock.entity';
import { Reservation } from '../src/reservations/entities/reservation.entity';
import { Movement } from '../src/movements/entities/movement.entity';
import { Warehouse } from '../src/warehouses/entities/warehouse.entity';

const OUTPUT_PATH = 'docs/er-diagram.md';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) ?? 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    Category,
    Provider,
    Product,
    ProductVariant,
    Lot,
    Employee,
    Sku,
    Alert,
    Stock,
    Reservation,
    Movement,
    Warehouse,
  ],
});

function columnTypeLabel(type: unknown): string {
  const raw = typeof type === 'function' ? type.name : String(type);
  return raw.replace(/[^a-zA-Z0-9_]/g, '_') || 'unknown';
}

function relationCardinality(relationType: string): string {
  switch (relationType) {
    case 'one-to-one':
      return '||--||';
    case 'many-to-many':
      return '}o--o{';
    default:
      // many-to-one (the only owning-side relation left besides the two above)
      return '}o--||';
  }
}

async function main() {
  await dataSource.initialize();

  const lines: string[] = ['erDiagram'];

  for (const meta of dataSource.entityMetadatas) {
    const uniqueColumnNames = new Set(
      meta.uniques.flatMap((unique) => unique.columns.map((column) => column.propertyName)),
    );

    lines.push(`  ${meta.name} {`);
    for (const column of meta.columns) {
      const flags = [
        column.isPrimary ? 'PK' : '',
        uniqueColumnNames.has(column.propertyName) ? 'UK' : '',
      ]
        .filter(Boolean)
        .join(',');
      lines.push(`    ${columnTypeLabel(column.type)} ${column.propertyName} ${flags}`.trimEnd());
    }
    lines.push('  }');
  }

  for (const meta of dataSource.entityMetadatas) {
    for (const relation of meta.relations) {
      if (!relation.isOwning || !relation.inverseEntityMetadata) continue;
      const cardinality = relationCardinality(relation.relationType);
      lines.push(
        `  ${meta.name} ${cardinality} ${relation.inverseEntityMetadata.name} : "${relation.propertyName}"`,
      );
    }
  }

  const markdown = [
    '# Diagrama ER',
    '',
    '> Generado automáticamente por `npm run diagram:er` a partir de las entidades reales de TypeORM. No editar a mano.',
    '',
    '```mermaid',
    ...lines,
    '```',
    '',
  ].join('\n');

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
  console.log(`Diagrama ER escrito en ${OUTPUT_PATH}`);

  await dataSource.destroy();
}

main().catch((error) => {
  console.error('No se pudo generar el diagrama ER:', error);
  process.exit(1);
});
