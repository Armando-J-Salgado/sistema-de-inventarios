import { ApiProperty } from "@nestjs/swagger";
import { Stock } from "src/stocks/entities/stock.entity";
import { Reservation } from "src/reservations/entities/reservation.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Movement {
	@ApiProperty({example: 1, description: 'Unique identifier of the movement'})
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({example: 10, description: 'Quantity moved'})
	@Column({type: 'int'})
	quantity: number;

	@ApiProperty({example: 'IN', description: 'Type of the movement'})
	@Column()
	type: string;

	@ApiProperty({example: 'COMPLETED', description: 'Status of the movement'})
	@Column()
	status: string;

	@ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Date of the movement'})
	@Column({type: 'timestamp'})
	date: Date;

	@ApiProperty({example: 120.5, description: 'Total cost of the movement'})
	@Column({type: 'float'})
	totalCost: number;

	@ApiProperty({example: 1, description: 'Transfer group ID'})
	@Column({type: 'uuid', nullable: true})
	transferGroupId: string;

	@ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of creation'})
	@CreateDateColumn()

	createdAt: Date;

	@ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of the last update'})
	@UpdateDateColumn()

	updatedAt: Date;

	@ApiProperty({example: '2026-07-19T19:17:00.00Z', description: 'Saves the time of deactivation'})
	@DeleteDateColumn()

	deletedAt: Date;

	@ApiProperty({type: ()=>Stock, description: 'Stock where the movement starts'})
	@ManyToOne(()=>Stock, (stock)=>stock.sourceMovements)
	sourceStock: Stock;

	@ApiProperty({type: ()=>Stock, required: false, description: 'Stock where the movement ends'})
	@ManyToOne(()=>Stock, (stock)=>stock.destinationMovements, {nullable: true})
	destinationStock: Stock;

	@ApiProperty({type: ()=>Reservation, required: false, description: 'Reservation related to the movement'})
	@OneToOne(()=>Reservation, (reservation)=>reservation.movement, {nullable: true})
	@JoinColumn()
	reservation: Reservation;
}
