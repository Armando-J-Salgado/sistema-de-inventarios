import { ValidationFactory } from './validation.factory';
import { LotAvailableValidator } from '../validations/lot-available.validator';
import { SkuExistenceValidator } from '../validations/sku-existence.validator';
import { IsWarehouseManagerValidator } from '../validations/is-warehouse-manager.validator';
import { WarehouseCapacityValidator } from '../validations/warehouse-capacity.validator';
import { ProductVariantExistenceValidator } from '../validations/product-variant-existence.validator';
import { ReservationExistenceValidator } from '../validations/reservation-existence.validator';
import { ReservationActiveStatusValidator } from '../validations/reservation-status.validator';
import { StockAvailabilityValidator } from '../validations/stock-availability.validator';
import { DestinationWarehouseCapacityValidator } from '../validations/destination-warehouse-capacity.validator';
import { BadRequestException } from '@nestjs/common';

describe('ValidationFactory', () => {
  it('returns LotAvailableValidator for "lot-availability"', () => {
    expect(ValidationFactory.make('lot-availability')).toBeInstanceOf(LotAvailableValidator);
  });

  it('returns SkuExistenceValidator for "sku-existence"', () => {
    expect(ValidationFactory.make('sku-existence')).toBeInstanceOf(SkuExistenceValidator);
  });

  it('returns IsWarehouseManagerValidator for "warehouse-manager-permission"', () => {
    expect(ValidationFactory.make('warehouse-manager-permission')).toBeInstanceOf(IsWarehouseManagerValidator);
  });

  it('returns WarehouseCapacityValidator for "warehouse-capacity"', () => {
    expect(ValidationFactory.make('warehouse-capacity')).toBeInstanceOf(WarehouseCapacityValidator);
  });

  it('returns ProductVariantExistenceValidator for "product-variant-existence"', () => {
    expect(ValidationFactory.make('product-variant-existence')).toBeInstanceOf(ProductVariantExistenceValidator);
  });

  it('returns ReservationExistenceValidator for "reservation-existence"', () => {
    expect(ValidationFactory.make('reservation-existence')).toBeInstanceOf(ReservationExistenceValidator);
  });

  it('returns ReservationActiveStatusValidator for "reservation-active-status"', () => {
    expect(ValidationFactory.make('reservation-active-status')).toBeInstanceOf(ReservationActiveStatusValidator);
  });

  it('returns StockAvailabilityValidator for "stock-availability"', () => {
    expect(ValidationFactory.make('stock-availability')).toBeInstanceOf(StockAvailabilityValidator);
  });

  it('returns DestinationWarehouseCapacityValidator for "destination-warehouse-capacity"', () => {
    expect(ValidationFactory.make('destination-warehouse-capacity')).toBeInstanceOf(DestinationWarehouseCapacityValidator);
  });

  it('throws BadRequestException for an unknown rule string', () => {
    expect(() => ValidationFactory.make('unknown-rule')).toThrow(BadRequestException);
  });
});
