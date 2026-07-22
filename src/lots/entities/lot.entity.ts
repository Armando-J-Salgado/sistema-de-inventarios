import { ApiProperty } from "@nestjs/swagger";
import { Provider } from "src/providers/entities/provider.entity";
import { Sku } from "src/skus/entities/skus.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Lot {
    @ApiProperty({example: 1, description: 'Unique identifier of the lot'})
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({example: 'RECEIVED', description: 'Status of the lot'})
    @Column()
    state: string;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Date the lot was received'})

    dateOfEntry: Date;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of creation'})
    @CreateDateColumn()

    createdAt: Date;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of the last update'})
    @UpdateDateColumn()

    updatedAt: Date;

    @ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of deactivation'})
    @DeleteDateColumn()

    deletedAt: Date;

    @ApiProperty({type: ()=>Provider, description: 'Provider of the lot'})
    @ManyToOne(()=>Provider, (provider)=>provider.lots)
    provider: Provider;

    @ApiProperty({type: ()=>[Sku], description: 'Specific product variants from the lot'})
    @OneToMany(()=>Sku, (sku)=>sku.lot)
    skus: Sku[];
}
