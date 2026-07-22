import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseAccessGuard } from './warehouse-access.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { Repository } from 'typeorm';

describe('WarehouseAccessGuard', () => {
  let guard: WarehouseAccessGuard;
  let mockRepository: jest.Mocked<Partial<Repository<Warehouse>>>;

  beforeEach(async () => {
    mockRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseAccessGuard,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockRepository,
        },
      ],
    }).compile();

    guard = module.get<WarehouseAccessGuard>(WarehouseAccessGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  const createMockContext = (user: any, params: any) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params
        })
      })
    } as unknown as ExecutionContext;
  };

  it('should allow access if user is ADMINISTRATOR', async () => {
    const context = createMockContext({ roles: 'ADMINISTRATOR' }, { warehouseId: '1' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow access if user is ANALYST', async () => {
    const context = createMockContext({ roles: 'ANALYST' }, { warehouseId: '1' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow access if user is WAREHOUSE_MANAGER and warehouse.administrator.id matches', async () => {
    mockRepository.findOne.mockResolvedValue({ id: 1, administrator: { id: 10 } } as any);
    const context = createMockContext(
      { roles: 'WAREHOUSE_MANAGER', employeeId: 10 }, 
      { warehouseId: '1' }
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should deny access if user is WAREHOUSE_MANAGER and warehouse.administrator.id does NOT match', async () => {
    mockRepository.findOne.mockResolvedValue({ id: 1, administrator: { id: 20 } } as any);
    const context = createMockContext(
      { roles: 'WAREHOUSE_MANAGER', employeeId: 10 }, 
      { warehouseId: '1' }
    );
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access if user is WAREHOUSE_MANAGER and warehouse is not found', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    const context = createMockContext(
      { roles: 'WAREHOUSE_MANAGER', employeeId: 10 }, 
      { warehouseId: '1' }
    );
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw if no user', async () => {
    const context = createMockContext(undefined, { warehouseId: '1' });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
