import { SkuExistenceValidator } from './sku-existence.validator';
import { BadRequestException } from '@nestjs/common';

describe('SkuExistenceValidator', () => {
  let validator: SkuExistenceValidator;

  beforeEach(() => {
    validator = new SkuExistenceValidator();
  });

  it('passes when sku exists and has sufficient quantity', () => {
    const context: any = {
      sku: { quantity: 10 },
      quantity: 5,
    };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws BadRequestException when sku is undefined', () => {
    const context: any = { quantity: 5 };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('Not enough items available. 5 were requested, only 0 available'),
    );
  });

  it('throws BadRequestException when sku has insufficient quantity', () => {
    const context: any = {
      sku: { quantity: 2, id: 'SKU-1' },
      quantity: 5,
    };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('Not enough items available. 5 were requested, only 2 available'),
    );
  });
});
