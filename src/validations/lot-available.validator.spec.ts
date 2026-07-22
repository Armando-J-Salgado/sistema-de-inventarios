import { LotAvailableValidator } from './lot-available.validator';
import { BadRequestException } from '@nestjs/common';

describe('LotAvailableValidator', () => {
  let validator: LotAvailableValidator;

  beforeEach(() => {
    validator = new LotAvailableValidator();
  });

  it('passes when sku.lot.state is RECEIVED', () => {
    const context: any = {
      sku: { lot: { state: 'RECEIVED' } },
    };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws BadRequestException when sku is undefined', () => {
    const context: any = {};
    expect(() => validator.handle(context)).toThrow(new BadRequestException('SKU was not found'));
  });

  it('throws BadRequestException when lot state is not RECEIVED', () => {
    const context: any = {
      sku: { lot: { id: 1, state: 'PENDING' } },
    };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('The sku belongs to lot with id 1 which is not available at the moment'),
    );
  });
});
