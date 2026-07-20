import { ApiProperty } from "@nestjs/swagger";
import { Category } from "src/categories/entities/category.entity";
import { ProductVariant } from "src/product-variants/entities/product-variant.entity";
import { Provider } from "src/providers/entities/provider.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Product {
    @ApiProperty({example: 1, description: 'Unique identifier of the product'})
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({example: 'Red Wine Bottle', description: 'Name of the product'})
    @Column()
    name: string;

    @ApiProperty({example: 'Units', description: 'Units of measurement'})
    @Column()
    unitOfMeasurement: string;

    @ApiProperty({example: true, description: 'Defines if the product is active'})
    @Column({default: true})
    active: boolean;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of creation'})
    @CreateDateColumn()
    @Column({type: 'timestamp'})
    createdAt: Date;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of the last update'})
    @UpdateDateColumn()
    @Column({type: 'timestamp'})
    updatedAt: Date;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of deactivation'})
    @DeleteDateColumn()
    @Column({type: 'timestamp'})
    deletedAt: Date;

    @ApiProperty({type: ()=>Category, description: 'Category of the product'})
    @ManyToOne(()=>Category, (category)=>category.products)
    category: Category;

    @ApiProperty({type: ()=>Provider, description: 'Provider of the product'})
    @ManyToOne(()=>Provider, (provider)=>provider.products)
    provider: Provider;

    @ApiProperty({type: ()=>[ProductVariant], description: 'List of variants related to the product'})
    @OneToMany(()=>ProductVariant, (variant)=>variant.product)
    variants: ProductVariant[];
}
