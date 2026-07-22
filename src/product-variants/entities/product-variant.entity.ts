import { ApiProperty } from "@nestjs/swagger";
import { Alert } from "src/alerts/entities/alert.entity";
import { Product } from "src/products/entities/product.entity";
import { Sku } from "src/skus/entities/skus.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class ProductVariant {
    @ApiProperty({example: 1, description: 'Unique identifier of the product variant'})
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({example: 'Red Wine glass-bottle xxl', description: 'Specific presentation of the product'})
    @Column()
    name: string;

    @ApiProperty({example: 'Delicious Red Wine for parties from the year 1978', description: 'Description of the product'})
    @Column()
    description: string;

    @ApiProperty({example: 10, description: 'Indicates when a reorder is needed based on remaining product'})
    @Column({type: 'int'})
    reorderPoint: number;

    @ApiProperty({example: true, description: 'Defines if the variant is active'})
    @Column({default: true})
    active: boolean;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of creation'})
    @CreateDateColumn()

    createdAt: Date;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of the last update'})
    @UpdateDateColumn()

    updatedAt: Date;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of deactivation'})
    @DeleteDateColumn()

    deletedAt: Date;

    @ApiProperty({type: ()=>Product, description: 'Product of origin of this variant'})
    @ManyToOne(()=>Product, (product)=>product.variants)
    product: Product;

    @ApiProperty({type: ()=>[Sku], description: 'List of specific items related to a lot'})
    @OneToMany(()=>Sku, (sku)=>sku.productVariant)
    skus: Sku[];

    @ApiProperty({type: ()=>[Alert], description: 'List of alerts related to a product variant'})
    @OneToMany(()=>Alert, (alerts)=>alerts.productVariant)
    alerts: Alert[];
}
