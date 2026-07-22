import { ApiProperty } from "@nestjs/swagger";
import { Employee } from "src/employees/entities/employee.entity";
import { Stock } from "src/stocks/entities/stock.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Warehouse {
	@ApiProperty({example: 1, description: 'Unique identifier of the warehouse'})
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({example: 'Central Warehouse', description: 'Name of the warehouse'})
	@Column()
	name: string;

	@ApiProperty({example: 1000, description: 'Maximum storage capacity of the warehouse'})
	@Column({type: 'int'})
	maximumCapacity: number;

	@ApiProperty({example: 250, description: 'Available storage capacity of the warehouse'})
	@Column({type: 'int'})
	availableCapacity: number;

	@ApiProperty({example: true, description: 'Defines if the warehouse is active'})
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

    @ApiProperty({type: ()=>Employee, description: 'Administrator of the warehouse'})
    @OneToOne(()=>Employee, (employee)=>employee.warehouse)
	@JoinColumn()
    administrator: Employee;

	@ApiProperty({type: ()=>[Stock], description: 'Stocks stored in the warehouse'})
	@OneToMany(()=>Stock, (stock)=>stock.warehouse)
	stocks: Stock[];
}
