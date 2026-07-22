import { ReservationActiveStatusValidator } from './reservation-status.validator';
import { BadRequestException } from '@nestjs/common';

describe('ReservationActiveStatusValidator', () => {
  let validator: ReservationActiveStatusValidator;

  beforeEach(() => {
    validator = new ReservationActiveStatusValidator();
  });

  it('passes when reservation status is ACTIVE', () => {
    const context: any = { reservation: { status: 'ACTIVE' } };
    const result = validator.handle(context);
    expect(result).toBe(true);
  });

  it('throws BadRequestException when reservation status is not ACTIVE', () => {
    const context: any = { reservation: { id: 1, status: 'COMPLETED' } };
    expect(() => validator.handle(context)).toThrow(
      new BadRequestException('The reservation with id 1 is not active (current status: COMPLETED)'),
    );
  });
});
