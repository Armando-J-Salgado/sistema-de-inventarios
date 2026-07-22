import { ApiProperty } from "@nestjs/swagger";
import { Product } from "src/products/entities/product.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Category {
    @ApiProperty({ example: 1, description: 'Unique identifier of the category' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 'Red Wines', description: 'Product type' })
    @Column()
    name: string;

    @ApiProperty({ example: true, description: 'Defines if the category is active' })
    @Column({ default: true })
    active: boolean;

    @ApiProperty({ example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of creation' })
    @CreateDateColumn()
    createdAt: Date;

    @ApiProperty({ example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of the last update' })
    @UpdateDateColumn()
    updatedAt: Date;

    @ApiProperty({ example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of deactivation' })
    @DeleteDateColumn()
    deletedAt: Date;

    @ApiProperty({ type: () => [Product], description: 'Lists of products related to the category' })
    @OneToMany(() => Product, (product) => product.category)
    products: Product[];
}
