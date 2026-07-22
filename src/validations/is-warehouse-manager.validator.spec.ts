import { IsWarehouseManagerValidator } from './is-warehouse-manager.validator';
import { ForbiddenException } from '@nestjs/common';

describe('IsWarehouseManagerValidator', () => {
  let validator: IsWarehouseManagerValidator;

  beforeEach(() => {
    validator = new IsWarehouseManagerValidator();
  });

  it('passes when employee is the warehouse administrator', () => {
    const context: any = {
      employee: { id: 1, role: 'WAREHOUSE_MANAGER' },
      warehouse: { id: 1, administrator: { id: 1 } },
    };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('passes when employee has ADMINISTRATOR role', () => {
    const context: any = {
      employee: { id: 2, role: 'ADMINISTRATOR' },
      warehouse: { id: 1, administrator: { id: 1 } },
    };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws ForbiddenException when employee is not admin and not the warehouse administrator', () => {
    const context: any = {
      employee: { id: 2, role: 'WAREHOUSE_MANAGER' },
      warehouse: { id: 1, administrator: { id: 1 } },
    };
    expect(() => validator.handle(context)).toThrow(
      new ForbiddenException('The employee is not allowed to manage warehouse #1'),
    );
  });
});
