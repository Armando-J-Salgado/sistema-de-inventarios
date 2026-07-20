import { ApiProperty } from "@nestjs/swagger";
import { ProductVariant } from "src/product-variants/entities/product-variant.entity";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Alert {
    @ApiProperty({example: 1, description: 'Unique identifier of the alert'})
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({example: 'Low stock of product', description: 'title of the alert'})
    @Column()
    title: string;

    @ApiProperty({example: 'Product quantity is 10 units below the reorder point', description: 'Description of the alert'})
    @Column()
    description: string;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of creation'})
    @CreateDateColumn()
    @Column({type: 'timestamp'})
    createdAt: Date;

    @ApiProperty({type: ()=>ProductVariant, description: 'Product Variant related to the alert'})
    @ManyToOne(()=>ProductVariant, (productVariant)=>productVariant.alerts)
    productVariant: ProductVariant;
}
