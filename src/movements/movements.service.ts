import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateEntryMovementDto } from './dto/create-entry-movement.dto';
import { CreateExitMovementDto } from './dto/create-exit-movement.dto';
import { CreateTransferMovementDto } from './dto/create-transfer-movement.dto';

@Injectable()
export class MovementsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  createEntry(createEntryMovementDto: CreateEntryMovementDto) {
    this.eventEmitter.emit('movement.created', createEntryMovementDto);
    return { message: 'mock response' };
  }

  createExit(createExitMovementDto: CreateExitMovementDto) {
    this.eventEmitter.emit('movement.created', createExitMovementDto);
    return { message: 'mock response' };
  }

  createTransfer(createTransferMovementDto: CreateTransferMovementDto) {
    this.eventEmitter.emit('movement.created', createTransferMovementDto);
    return { message: 'mock response' };
  }

  revertMovement(id: number) {
    return { message: 'mock response' };
  }
}
