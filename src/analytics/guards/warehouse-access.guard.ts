import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';

@Injectable()
export class WarehouseAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.roles?.includes('ADMINISTRATOR') || user.roles?.includes('ANALYST')) {
      return true;
    }

    if (user.roles?.includes('WAREHOUSE_MANAGER')) {
      const requestedWarehouseId = parseInt(request.params.warehouseId, 10);
      if (isNaN(requestedWarehouseId)) {
        throw new ForbiddenException('Invalid warehouseId format');
      }

      // Query DB for warehouse manager
      const warehouse = await this.warehouseRepository.findOne({
        where: { id: requestedWarehouseId },
        relations: ['administrator'],
      });

      if (!warehouse) {
        throw new ForbiddenException('Warehouse not found');
      }

      if (warehouse.administrator?.id !== user.employeeId) {
        throw new ForbiddenException('Access denied to this warehouse analytics');
      }
      
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
