import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private sanitizeEmployee(employee: Employee): Omit<Employee, 'password'> {
    const { password, ...safeEmployee } = employee as Employee & { password?: string };
    return safeEmployee;
  }

  private async ensureNoActiveWarehouse(employee: Employee): Promise<void> {
    if (employee.warehouse?.active) {
      throw new ConflictException('El empleado tiene una bodega activa asignada');
    }
  }

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Omit<Employee, 'password'>> {
    const existingEmployee = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email },
    });

    if (existingEmployee) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createEmployeeDto.password, 10);
    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      password: hashedPassword,
    });
    const savedEmployee = await this.employeeRepository.save(employee);
    return this.sanitizeEmployee(savedEmployee);
  }

  async findAll(active?: boolean, role?: string): Promise<Employee[]> {
    const where: FindOptionsWhere<Employee> = {};

    if (active !== undefined) {
      where.active = active;
    }

    if (role) {
      where.role = role;
    }

    const findOptions: FindManyOptions<Employee> = {
      relations: {
        warehouse: true,
      },
    };

    if (Object.keys(where).length > 0) {
      findOptions.where = where;
    }

    return this.employeeRepository.find(findOptions);
  }

  async findOne(id: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: {
        warehouse: true,
      },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return employee;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Omit<Employee, 'password'>> {
    const employee = await this.findOne(id);

    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const duplicateEmployee = await this.employeeRepository.findOne({
        where: { email: updateEmployeeDto.email },
      });

      if (duplicateEmployee && duplicateEmployee.id !== id) {
        throw new ConflictException('El correo electrónico ya está registrado');
      }
    }

    if (updateEmployeeDto.active === false) {
      await this.ensureNoActiveWarehouse(employee);
    }

    const updatedEmployee = this.employeeRepository.create({
      ...employee,
      ...updateEmployeeDto,
    });

    if (updateEmployeeDto.password) {
      updatedEmployee.password = await bcrypt.hash(updateEmployeeDto.password, 10);
    }

    const savedEmployee = await this.employeeRepository.save(updatedEmployee);
    return this.sanitizeEmployee(savedEmployee);
  }

  async remove(id: number): Promise<Omit<Employee, 'password'>> {
    const employee = await this.findOne(id);
    await this.ensureNoActiveWarehouse(employee);

    employee.active = false;
    const savedEmployee = await this.employeeRepository.save(employee);
    return this.sanitizeEmployee(savedEmployee);
  }
}
