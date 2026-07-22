import { WarehouseCapacityValidator } from './warehouse-capacity.validator';
import { BadRequestException } from '@nestjs/common';

describe('WarehouseCapacityValidator', () => {
  let validator: WarehouseCapacityValidator;

  beforeEach(() => {
    validator = new WarehouseCapacityValidator();
  });

  it('passes when warehouse has enough available capacity', () => {
    const context: any = {
      warehouse: { availableCapacity: 10 },
      quantity: 5,
    };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws BadRequestException when warehouse lacks capacity', () => {
    const context: any = {
      warehouse: { id: 1, availableCapacity: 2 },
      quantity: 5,
    };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('There is not enough capacity in the warehouse. Needs 5 spaces, only 2 spaces remaining'),
    );
  });
});
