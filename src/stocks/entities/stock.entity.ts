import { ApiProperty } from "@nestjs/swagger";
import { Sku } from "src/skus/entities/skus.entity";
import { Reservation } from "src/reservations/entities/reservation.entity";
import { Movement } from "src/movements/entities/movement.entity";
import { Warehouse } from "src/warehouses/entities/warehouse.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Stock {
	@ApiProperty({example: 1, description: 'Unique identifier of the stock'})
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({example: 25, description: 'Quantity available in stock'})
	@Column({type: 'int'})
	quantity: number;

	@ApiProperty({example: true, description: 'Defines if the stock is active'})
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

    @ApiProperty({type: ()=>Sku, description: 'Specific product variant from a lot that makes the stock'})
    @ManyToOne(()=>Sku, (sku)=>sku.stocks)
    sku: Sku;

	@ApiProperty({type: ()=>Warehouse, description: 'Warehouse that stores this stock'})
	@ManyToOne(()=>Warehouse, (warehouse)=>warehouse.stocks)
	warehouse: Warehouse;

	@ApiProperty({type: ()=>[Reservation], description: 'Reservations made from this stock'})
	@OneToMany(()=>Reservation, (reservation)=>reservation.stock)
	reservations: Reservation[];

	@ApiProperty({type: ()=>[Movement], description: 'Movements that originate from this stock'})
	@OneToMany(()=>Movement, (movement)=>movement.sourceStock)
	sourceMovements: Movement[];

	@ApiProperty({type: ()=>[Movement], description: 'Movements that arrive to this stock'})
	@OneToMany(()=>Movement, (movement)=>movement.destinationStock)
	destinationMovements: Movement[];

    
}
