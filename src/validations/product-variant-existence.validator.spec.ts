import { ProductVariantExistenceValidator } from './product-variant-existence.validator';
import { NotFoundException } from '@nestjs/common';

describe('ProductVariantExistenceValidator', () => {
  let validator: ProductVariantExistenceValidator;

  beforeEach(() => {
    validator = new ProductVariantExistenceValidator();
  });

  it('passes when skus array is non-empty', () => {
    const context: any = {
      skus: [{ id: 1 }],
      productVariantId: 1,
    };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws NotFoundException when skus is undefined', () => {
    const context: any = { productVariantId: 1 };
    expect(() => validator.handle(context)).toThrow(
      new NotFoundException('Product variant 1 has no available lots'),
    );
  });

  it('throws NotFoundException when skus is empty', () => {
    const context: any = {
      skus: [],
      productVariantId: 1,
    };
    expect(() => validator.handle(context)).toThrow(
      new NotFoundException('Product variant 1 has no available lots'),
    );
  });
});
