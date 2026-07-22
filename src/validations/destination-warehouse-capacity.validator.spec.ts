import { DestinationWarehouseCapacityValidator } from './destination-warehouse-capacity.validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DestinationWarehouseCapacityValidator', () => {
  let validator: DestinationWarehouseCapacityValidator;

  beforeEach(() => {
    validator = new DestinationWarehouseCapacityValidator();
  });

  it('passes when destination warehouse has enough available capacity', () => {
    const context: any = {
      destinationWarehouse: { id: 2, active: true, availableCapacity: 10 },
      quantity: 5,
    };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws NotFoundException when destination warehouse is not found', () => {
    const context: any = { quantity: 5 };
    expect(() => validator.handle(context)).toThrow(new NotFoundException('Destination warehouse was not found'));
  });

  it('throws BadRequestException when destination warehouse is not active', () => {
    const context: any = {
      destinationWarehouse: { id: 2, active: false, availableCapacity: 10 },
      quantity: 5,
    };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('The destination warehouse with id 2 is not active'),
    );
  });

  it('throws BadRequestException when destination warehouse lacks capacity', () => {
    const context: any = {
      destinationWarehouse: { id: 2, active: true, availableCapacity: 2 },
      quantity: 5,
    };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('Insufficient capacity in destination warehouse 2: available 2, needed 5'),
    );
  });
});
