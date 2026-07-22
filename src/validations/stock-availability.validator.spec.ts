import { StockAvailabilityValidator } from './stock-availability.validator';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('StockAvailabilityValidator', () => {
  let validator: StockAvailabilityValidator;

  beforeEach(() => {
    validator = new StockAvailabilityValidator();
  });

  it('passes when stock is present, active, and has enough quantity', () => {
    const context: any = {
      stock: { id: 1, active: true, quantity: 10 },
      quantity: 5,
    };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws NotFoundException when stock is undefined', () => {
    const context: any = { quantity: 5 };
    expect(() => validator.handle(context)).toThrow(new NotFoundException('Stock was not found'));
  });

  it('throws BadRequestException when stock is not active', () => {
    const context: any = {
      stock: { id: 1, active: false, quantity: 10 },
      quantity: 5,
    };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('The stock with id 1 is not active'),
    );
  });

  it('throws BadRequestException when stock does not have enough quantity', () => {
    const context: any = {
      stock: { id: 1, active: true, quantity: 2 },
      quantity: 5,
    };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('Insufficient stock for stock id 1: available 2, needed 5'),
    );
  });
});
