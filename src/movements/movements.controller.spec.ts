import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { RolesGuard } from 'src/jwt/roles/roles.guard';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateIssueDto } from './dto/create-issue.dto';
import { IssueFromReservationDto } from './dto/issue-from-reservation.dto';
import { TransferMovementDto } from './dto/transfer-movement.dto';
import { TransferFromReservationDto } from './dto/transfer-from-reservation.dto';
import { ReceiveTransferDto } from './dto/receive-transfer.dto';
import { ReceiveDecision } from 'src/enums/movement-type.enum';
import { FindMovementsQueryDto } from './dto/find-movements.dto';

describe('MovementsController', () => {
  let controller: MovementsController;
  let service: jest.Mocked<MovementsService>;

  beforeEach(async () => {
    const mockService = {
      createEntry: jest.fn(),
      createIssue: jest.fn(),
      createIssueFromTransfer: jest.fn(),
      createTransfer: jest.fn(),
      createTransferFromReservation: jest.fn(),
      receiveTransfer: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovementsController],
      providers: [{ provide: MovementsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MovementsController>(MovementsController);
    service = module.get(MovementsService);
  });

  it('createEntry — delegates to movementsService.createEntry with DTO', async () => {
    const dto: CreateEntryDto = { quantity: 10, skuId: 'SKU-1', warehouseId: 1, employeeId: 2 };
    service.createEntry.mockResolvedValue({ id: 1 } as any);
    const result = await controller.createEntry(dto);
    expect(service.createEntry).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1 });
  });

  it('createIssue — delegates to movementsService.createIssue with DTO', async () => {
    const dto: CreateIssueDto = { quantity: 5, productVariantId: 1, warehouseId: 1, employeeId: 2 };
    service.createIssue.mockResolvedValue([{ id: 1 }] as any);
    const result = await controller.createIssue(dto);
    expect(service.createIssue).toHaveBeenCalledWith(dto);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('createIssueFromReservation — delegates to movementsService.createIssueFromTransfer with DTO', async () => {
    const dto: IssueFromReservationDto = { employeeId: 1, reservationId: 1 };
    service.createIssueFromTransfer.mockResolvedValue({ id: 1 } as any);
    const result = await controller.createIssueFromReservation(dto);
    expect(service.createIssueFromTransfer).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1 });
  });

  it('createTransfer — delegates to movementsService.createTransfer with DTO', async () => {
    const dto: TransferMovementDto = { quantity: 5, productVariantId: 1, originWarehouseId: 1, destinationWarehouseId: 2, employeeId: 1 };
    service.createTransfer.mockResolvedValue([{ id: 1 }] as any);
    const result = await controller.createTransfer(dto);
    expect(service.createTransfer).toHaveBeenCalledWith(dto);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('createTransferFromReservation — delegates to movementsService.createTransferFromReservation with DTO', async () => {
    const dto: TransferFromReservationDto = { employeeId: 1, reservationId: 1, destinationWarehouseId: 2 };
    service.createTransferFromReservation.mockResolvedValue({ id: 1 } as any);
    const result = await controller.createTransferFromReservation(dto);
    expect(service.createTransferFromReservation).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 1 });
  });

  it('receiveTransfer — delegates to movementsService.receiveTransfer with DTO', async () => {
    const dto: ReceiveTransferDto = { transferGroupId: 1, employeeId: 1, decision: ReceiveDecision.ACCEPT };
    service.receiveTransfer.mockResolvedValue([{ id: 1 }] as any);
    const result = await controller.receiveTransfer(dto);
    expect(service.receiveTransfer).toHaveBeenCalledWith(dto);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('findOne — delegates to movementsService.findOne with numeric id', async () => {
    service.findOne.mockResolvedValue({ id: 5 } as any);
    const result = await controller.findOne('5');
    expect(service.findOne).toHaveBeenCalledWith(5);
    expect(result).toEqual({ id: 5 });
  });

  it('findAll — delegates to movementsService.findAll with query', async () => {
    const query: FindMovementsQueryDto = { warehouseId: 1 };
    service.findAll.mockResolvedValue([{ id: 1 }] as any);
    const result = await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual([{ id: 1 }]);
  });
});
