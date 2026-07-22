import { ReservationExistenceValidator } from './reservation-existence.validator';
import { NotFoundException } from '@nestjs/common';

describe('ReservationExistenceValidator', () => {
  let validator: ReservationExistenceValidator;

  beforeEach(() => {
    validator = new ReservationExistenceValidator();
  });

  it('passes when reservation is defined', () => {
    const context: any = { reservation: { id: 1 } };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws NotFoundException when reservation is undefined', () => {
    const context: any = {};
    expect(() => validator.handle(context)).toThrow(new NotFoundException('Reservation was not found'));
  });
});
