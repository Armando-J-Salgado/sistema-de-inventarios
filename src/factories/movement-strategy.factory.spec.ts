import { Test, TestingModule } from '@nestjs/testing';
import { MovementStrategyFactory } from './movement-strategy.factory';
import { EntranceMovementStrategy } from '../strategies/entrance-movement.strategy';
import { IssueMovementStrategy } from '../strategies/issue-movement.strategy';
import { TransferMovementStrategy } from '../strategies/transfer-movement.strategy';
import { TransferFromReservationStrategy } from '../strategies/transfer-from-reservation.strategy';
import { IssueFromReservationStrategy } from '../strategies/issue-from-reservation.strategy';
import { MovementType } from '../enums/movement-type.enum';
import { BadRequestException } from '@nestjs/common';

describe('MovementStrategyFactory', () => {
  let factory: MovementStrategyFactory;
  let entrance: EntranceMovementStrategy;
  let issue: IssueMovementStrategy;
  let transfer: TransferMovementStrategy;
  let transferFromRes: TransferFromReservationStrategy;
  let issueFromRes: IssueFromReservationStrategy;

  beforeEach(async () => {
    const mockEntrance = {};
    const mockIssue = {};
    const mockTransfer = {};
    const mockTransferFromRes = {};
    const mockIssueFromRes = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementStrategyFactory,
        { provide: EntranceMovementStrategy, useValue: mockEntrance },
        { provide: IssueMovementStrategy, useValue: mockIssue },
        { provide: TransferMovementStrategy, useValue: mockTransfer },
        { provide: TransferFromReservationStrategy, useValue: mockTransferFromRes },
        { provide: IssueFromReservationStrategy, useValue: mockIssueFromRes },
      ],
    }).compile();

    factory = module.get<MovementStrategyFactory>(MovementStrategyFactory);
    entrance = module.get(EntranceMovementStrategy);
    issue = module.get(IssueMovementStrategy);
    transfer = module.get(TransferMovementStrategy);
    transferFromRes = module.get(TransferFromReservationStrategy);
    issueFromRes = module.get(IssueFromReservationStrategy);
  });

  it('returns EntranceMovementStrategy for ENTRANCE', () => {
    expect(factory.make(MovementType.ENTRANCE)).toBe(entrance);
  });

  it('returns IssueMovementStrategy for ISSUE', () => {
    expect(factory.make(MovementType.ISSUE)).toBe(issue);
  });

  it('returns TransferMovementStrategy for TRANSFER', () => {
    expect(factory.make(MovementType.TRANSFER)).toBe(transfer);
  });

  it('returns TransferFromReservationStrategy for TRANSFER_FROM_RESERVATION', () => {
    expect(factory.make(MovementType.TRANSFER_FROM_RESERVATION)).toBe(transferFromRes);
  });

  it('returns IssueFromReservationStrategy for ISSUE_FROM_RESERVATION', () => {
    expect(factory.make(MovementType.ISSUE_FROM_RESERVATION)).toBe(issueFromRes);
  });

  it('throws BadRequestException for an unknown movement type string', () => {
    expect(() => factory.make('UNKNOWN' as MovementType)).toThrow(BadRequestException);
  });
});
