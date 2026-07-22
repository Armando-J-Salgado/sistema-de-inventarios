import { ApiProperty } from "@nestjs/swagger";
import { Lot } from "src/lots/entities/lot.entity";
import { ProductVariant } from "src/product-variants/entities/product-variant.entity";
import { Stock } from "src/stocks/entities/stock.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Sku {
    @ApiProperty({example: 'PV1-L1-1', description: 'Unique code for an SKU'})
    @PrimaryColumn()
    id: string;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Date the variant from the lot was received'})
    @Column({type: 'timestamp'})
    dateOfEntry: Date;

    @ApiProperty({example: 10, description: 'Number of units received'})
    @Column({type: 'int'})
    quantity: number;

    @ApiProperty({example: 10.50, description: 'Cost per unit of this sku'})
    @Column({type: 'decimal'})
    unitCost: number;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Recommended date before consumption'})
    @Column({type: 'timestamp'})
    bestBeforeDate: Date;

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

    @ApiProperty({type: ()=>Lot, description: 'Lot of origin from this specific items'})
    @ManyToOne(()=>Lot, (lot)=>lot.skus)
    lot: Lot;

    @ApiProperty({type: ()=>ProductVariant, description: 'Specific type of producto of these items'})
    @ManyToOne(()=>ProductVariant, (productVariant)=>productVariant.skus)
    productVariant: ProductVariant;

    @ApiProperty({type: ()=>[Stock], description: 'Inventorys of the specific items stored in a warehouse'})
    @OneToMany(()=>Stock, (stock)=>stock.sku)
    stocks: Stock[];
}
