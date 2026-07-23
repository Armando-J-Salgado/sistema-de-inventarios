import { BadRequestException, Injectable } from "@nestjs/common";
import { MovementType } from "../enums/movement-type.enum";
import { EntranceMovementStrategy } from "../strategies/entrance-movement.strategy";
import { IssueFromReservationStrategy } from "../strategies/issue-from-reservation.strategy";
import { IssueMovementStrategy } from "../strategies/issue-movement.strategy";
import { MovementStrategy } from "../strategies/movement-strategy.interface";
import { TransferFromReservationStrategy } from "../strategies/transfer-from-reservation.strategy";
import { TransferMovementStrategy } from "../strategies/transfer-movement.strategy";

@Injectable()
export class MovementStrategyFactory {
  private readonly strategies: Record<MovementType, MovementStrategy>;

  constructor(
    private readonly entrance: EntranceMovementStrategy,
    private readonly issue: IssueMovementStrategy,
    private readonly transfer: TransferMovementStrategy,
    private readonly transferFromReservation: TransferFromReservationStrategy,
    private readonly issueFromReservation: IssueFromReservationStrategy,
  ) {
    this.strategies = {
      [MovementType.ENTRANCE]: entrance,
      [MovementType.ISSUE]: issue,
      [MovementType.TRANSFER]: transfer,
      [MovementType.TRANSFER_FROM_RESERVATION]: transferFromReservation,
      [MovementType.ISSUE_FROM_RESERVATION]: issueFromReservation,
    };
  }

  make(type: MovementType): MovementStrategy {
    const strategy = this.strategies[type];
    if (!strategy) throw new BadRequestException(`Unsupported movement type: ${type}`);
    return strategy;
  }
}