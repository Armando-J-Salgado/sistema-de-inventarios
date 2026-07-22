import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEntryDto } from './create-entry.dto';
import { CreateIssueDto } from './create-issue.dto';
import { TransferMovementDto } from './transfer-movement.dto';
import { TransferFromReservationDto } from './transfer-from-reservation.dto';
import { IssueFromReservationDto } from './issue-from-reservation.dto';
import { ReceiveTransferDto } from './receive-transfer.dto';
import { ReceiveDecision } from '../../enums/movement-type.enum';

describe('Movements DTO Validation', () => {
  describe('CreateEntryDto', () => {
    it('should fail if empty object is provided', async () => {
      const dto = plainToInstance(CreateEntryDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with valid payload', async () => {
      const payload = { quantity: 10, skuId: 'SKU-001', warehouseId: 1, employeeId: 2 };
      const dto = plainToInstance(CreateEntryDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid field types', async () => {
      const payload = { quantity: 'ten', skuId: 123, warehouseId: 'one', employeeId: 'two' };
      const dto = plainToInstance(CreateEntryDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CreateIssueDto', () => {
    it('should fail if empty object is provided', async () => {
      const dto = plainToInstance(CreateIssueDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with valid payload', async () => {
      const payload = { quantity: 5, productVariantId: 3, warehouseId: 1, employeeId: 2 };
      const dto = plainToInstance(CreateIssueDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('TransferMovementDto', () => {
    it('should fail if empty object is provided', async () => {
      const dto = plainToInstance(TransferMovementDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with valid payload', async () => {
      const payload = { quantity: 8, productVariantId: 3, originWarehouseId: 1, destinationWarehouseId: 2, employeeId: 4 };
      const dto = plainToInstance(TransferMovementDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('TransferFromReservationDto', () => {
    it('should fail if empty object is provided', async () => {
      const dto = plainToInstance(TransferFromReservationDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with valid payload', async () => {
      const payload = { employeeId: 2, reservationId: 5, destinationWarehouseId: 3 };
      const dto = plainToInstance(TransferFromReservationDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('IssueFromReservationDto', () => {
    it('should fail if empty object is provided', async () => {
      const dto = plainToInstance(IssueFromReservationDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with valid payload', async () => {
      const payload = { employeeId: 1, reservationId: 1 };
      const dto = plainToInstance(IssueFromReservationDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ReceiveTransferDto', () => {
    it('should fail if empty object is provided', async () => {
      const dto = plainToInstance(ReceiveTransferDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with valid payload', async () => {
      const payload = { transferGroupId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', employeeId: 2, decision: ReceiveDecision.ACCEPT };
      const dto = plainToInstance(ReceiveTransferDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid decision', async () => {
      const payload = { transferGroupId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', employeeId: 2, decision: 'INVALID' };
      const dto = plainToInstance(ReceiveTransferDto, payload);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
