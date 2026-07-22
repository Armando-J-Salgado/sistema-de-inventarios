import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Warehouse } from './entities/warehouse.entity';
import { Employee } from 'src/employees/entities/employee.entity';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly repository: Repository<Warehouse>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async create(createWarehouseDto: CreateWarehouseDto): Promise<Warehouse> {
    const existing = await this.repository.findOne({ where: { name: createWarehouseDto.name } });
    if (existing) {
      throw new ConflictException('Warehouse name already exists');
    }

    const warehouse = this.repository.create({
      name: createWarehouseDto.name,
      maximumCapacity: createWarehouseDto.maximumCapacity,
      availableCapacity: createWarehouseDto.maximumCapacity,
    });

    if (createWarehouseDto.administratorId !== undefined) {
      warehouse.administrator = await this.validateAdministrator(createWarehouseDto.administratorId);
    }

    return await this.repository.save(warehouse);
  }

  async findAll(active: boolean | undefined): Promise<Warehouse[]> {
    const where = active === undefined ? {} : { where: { active } };
    return await this.repository.find({ ...where, relations: { administrator: true } });
  }

  async findOne(id: number): Promise<Warehouse> {
    const warehouse = await this.repository.findOne({
      where: { id },
      relations: { administrator: true, stocks: true },
    });
    if (!warehouse) {
      throw new NotFoundException(`The warehouse with id #${id} could not be found`);
    }
    return warehouse;
  }

  async update(id: number, updateWarehouseDto: UpdateWarehouseDto): Promise<Warehouse> {
    const warehouse = await this.repository.findOne({ where: { id }, relations: { administrator: true } });
    if (!warehouse) {
      throw new NotFoundException(`The warehouse with id #${id} could not be found`);
    }

    if (updateWarehouseDto.name && updateWarehouseDto.name !== warehouse.name) {
      const nameConflict = await this.repository.findOne({ where: { name: updateWarehouseDto.name } });
      if (nameConflict) {
        throw new ConflictException('Warehouse name already exists');
      }
    }

    if (
      updateWarehouseDto.maximumCapacity !== undefined &&
      updateWarehouseDto.maximumCapacity !== warehouse.maximumCapacity
    ) {
      const newAvailableCapacity =
        warehouse.availableCapacity + (updateWarehouseDto.maximumCapacity - warehouse.maximumCapacity);
      if (newAvailableCapacity < 0) {
        throw new BadRequestException('Maximum capacity cannot be lower than the stock currently on hand');
      }
      warehouse.availableCapacity = newAvailableCapacity;
    }

    if (updateWarehouseDto.administratorId !== undefined) {
      warehouse.administrator = await this.validateAdministrator(updateWarehouseDto.administratorId, warehouse.id);
    }

    const updatedWarehouse = Object.assign(warehouse, updateWarehouseDto);
    return await this.repository.save(updatedWarehouse);
  }

  async remove(id: number): Promise<Warehouse> {
    const warehouse = await this.repository.findOne({ where: { id }, relations: { stocks: true } });
    if (!warehouse) {
      throw new NotFoundException(`The warehouse with id #${id} could not be found`);
    }

    const hasStockOnHand = warehouse.stocks?.some((stock) => stock.active && stock.quantity > 0);
    if (hasStockOnHand) {
      throw new ConflictException('Cannot deactivate warehouse with stock on hand');
    }

    warehouse.active = false;
    return await this.repository.save(warehouse);
  }

  private async validateAdministrator(employeeId: number, excludeWarehouseId?: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException(`The employee with id #${employeeId} could not be found`);
    }

    if (employee.role !== 'WAREHOUSE_MANAGER' && employee.role !== 'ADMINISTRATOR') {
      throw new BadRequestException(
        'The employee must have role WAREHOUSE_MANAGER or ADMINISTRATOR to administer a warehouse',
      );
    }

    const existingAssignment = await this.repository.findOne({
      where: { administrator: { id: employeeId }, active: true },
      relations: { administrator: true },
    });
    if (existingAssignment && existingAssignment.id !== excludeWarehouseId) {
      throw new ConflictException('Employee is already administrating another warehouse');
    }

    return employee;
  }
}
