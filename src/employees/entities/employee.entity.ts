import { ApiProperty } from "@nestjs/swagger";
import { Warehouse } from "../../warehouses/entities/warehouse.entity";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Employee {
    @ApiProperty({example: 1, description: 'Unique identifier of the employee'})
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({example: 'john.doe@company.com', description: 'Email of the employee'})
    @Column({unique: true})
    email: string;

    @ApiProperty({example: 'StrongPassword123', description: 'Password of the employee'})
    @Column({select: false})
    password: string;

    @ApiProperty({example: 'John Doe', description: 'Name of the employee'})
    @Column()
    name: string;

    @ApiProperty({example: '123 Main Street, City', description: 'Address of the employee'})
    @Column()
    address: string;

    @ApiProperty({example: 'ADMINISTRATOR', description: 'Role of the employee'})
    @Column()
    role: string;

    @ApiProperty({example: true, description: 'Defines if the employee is active'})
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

    @ApiProperty({type: ()=>Warehouse, description: 'Warehouse administrated by the employee'})
    @OneToOne(()=>Warehouse, (warehouse)=>warehouse.administrator)
    warehouse: Warehouse;
}
