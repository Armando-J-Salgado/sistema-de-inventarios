import { ApiProperty } from '@nestjs/swagger';
import { Provider } from '../../providers/entities/provider.entity';
import { Sku } from '../../skus/entities/skus.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { LotState } from '../enums/lot-state.enum';

@Entity('lots')
export class Lot {
    @ApiProperty({ example: 1, description: 'Unique identifier of the lot' })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ example: 1, description: 'Identifier of the provider that sent the lot' })
    @Column()
    providerId: number;

    @ApiProperty({ type: () => Provider, description: 'Provider of the lot' })
    @ManyToOne(() => Provider, (provider) => provider.lots, { onDelete: 'RESTRICT', nullable: false })
    @JoinColumn({ name: 'providerId' })
    provider: Provider;

    @ApiProperty({ example: '2026-07-19T19:17:00.00Z', description: 'Date the lot was received' })
    @Column({ type: 'timestamp' })
    dateOfEntry: Date;

    @ApiProperty({
        example: LotState.RECEIVED,
        enum: LotState,
        description: 'Status of the lot',
    })
    @Column({ type: 'varchar', default: LotState.RECEIVED })
    state: LotState;

    @ApiProperty({ example: true, description: 'Defines whether the lot is active' })
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

    @ApiProperty({ type: () => [Sku], description: 'Specific product variants from the lot' })
    @OneToMany(() => Sku, (sku) => sku.lot)
    skus: Sku[];
}
