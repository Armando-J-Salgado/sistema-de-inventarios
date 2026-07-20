import { ApiProperty } from "@nestjs/swagger";
import { Stock } from "src/stocks/entities/stock.entity";
import { Movement } from "src/movements/entities/movement.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Reservation {
	@ApiProperty({example: 1, description: 'Unique identifier of the reservation'})
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({example: 10, description: 'Quantity reserved'})
	@Column({type: 'int'})
	quantity: number;

	@ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Start date of the reservation'})
	@Column({type: 'timestamp'})
	fromDate: Date;

	@ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'End date of the reservation'})
	@Column({type: 'timestamp'})
	toDate: Date;

	@ApiProperty({example: 'PENDING', description: 'Status of the reservation'})
	@Column()
	status: string;

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

	@ApiProperty({type: ()=>Stock, description: 'Stock from which the reservation is made'})
	@ManyToOne(()=>Stock, (stock)=>stock.reservations)
	stock: Stock;

	@ApiProperty({type: ()=>Movement, description: 'Movement related to the reservation'})
	@OneToOne(()=>Movement, (movement)=>movement.reservation)
	movement: Movement;
}
