import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { Warehouse } from 'src/warehouses/entities/warehouse.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Warehouse])
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
