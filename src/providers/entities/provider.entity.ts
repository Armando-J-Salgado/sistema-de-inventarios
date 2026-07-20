import { ApiProperty } from "@nestjs/swagger";
import { Lot } from "src/lots/entities/lot.entity";
import { Product } from "src/products/entities/product.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Provider {
    @ApiProperty({example: 1, description: 'Unique identifier for the provider'})
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({example: 'Seeds & Juices Inc.', description: 'Name of the provider'})
    @Column()
    name: string;

    @ApiProperty({example: 'Blaker Street 182C, New York Av.', description: 'Address of the provider'})
    @Column()
    address: string;

    @ApiProperty({example: 'seeds@juices.com', description: 'Email of the provider'})
    @Column({unique: true})
    email: string;

    @ApiProperty({example: true, description: 'Defines if the provider is still active'})
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

    @ApiProperty({type: ()=>[Product], description: 'List of products related to the provider'})
    @OneToMany(()=>Product, (product)=>product.provider)
    products: Product[];

    @ApiProperty({type: ()=>[Lot], description: 'List of lots sent by the provider'})
    @OneToMany(()=>Lot, (lot)=>lot.provider)
    lots: Lot[];

}
