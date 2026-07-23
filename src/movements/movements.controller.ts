import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreateIssueDto } from './dto/create-issue.dto';
import { TransferMovementDto } from './dto/transfer-movement.dto';
import { TransferFromReservationDto } from './dto/transfer-from-reservation.dto';
import { ReceiveTransferDto } from './dto/receive-transfer.dto';
import { FindMovementsQueryDto } from './dto/find-movements.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiConflictResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt/jwt.guard';
import { RolesGuard } from '../jwt/roles/roles.guard';
import { Roles } from '../jwt/roles/roles.decorator';
import { IssueFromReservationDto } from './dto/issue-from-reservation.dto';
import { Movement } from './entities/movement.entity';

@ApiTags('movements')
@ApiBearerAuth()
@Roles('ADMINISTRATOR', 'WAREHOUSE_MANAGER')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post('entry')
  @ApiOperation({ summary: 'Create an entry movement' })
  @ApiCreatedResponse({ type: Movement })
  @ApiBadRequestResponse({ description: 'Bad request (e.g., validation failed, capacity exceeded)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden (requires ADMINISTRATOR or WAREHOUSE_MANAGER role)' })
  @ApiNotFoundResponse({ description: 'SKU or warehouse not found' })
  createEntry(@Body() dto: CreateEntryDto) {
    return this.movementsService.createEntry(dto);
  }

  @Post('issue')
  @ApiOperation({ summary: 'Create an issue movement' })
  @ApiCreatedResponse({ type: Movement, isArray: true })
  @ApiBadRequestResponse({ description: 'Bad request (e.g., insufficient stock)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Product variant or warehouse not found' })
  @ApiConflictResponse({ description: 'Conflict' })
  createIssue(@Body() dto: CreateIssueDto) {
    return this.movementsService.createIssue(dto);
  }

  @Post('issue-from-reservation')
  @ApiOperation({ summary: 'Create an issue movement from an existing reservation' })
  @ApiOkResponse({ type: Movement })
  @ApiBadRequestResponse({ description: 'Bad request (e.g., reservation not ACTIVE)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Reservation or warehouse not found' })
  createIssueFromReservation(@Body() dto: IssueFromReservationDto) {
    return this.movementsService.createIssueFromTransfer(dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Create a transfer movement between warehouses' })
  @ApiCreatedResponse({ type: Movement, isArray: true })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Warehouse not found' })
  @ApiConflictResponse({ description: 'Conflict' })
  createTransfer(@Body() dto: TransferMovementDto) {
    return this.movementsService.createTransfer(dto);
  }

  @Post('transfer-from-reservation')
  @ApiOperation({ summary: 'Create a transfer movement from a reservation' })
  @ApiOkResponse({ type: Movement })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Reservation or warehouse not found' })
  @ApiConflictResponse({ description: 'Conflict' })
  createTransferFromReservation(@Body() dto: TransferFromReservationDto) {
    return this.movementsService.createTransferFromReservation(dto);
  }

  @Post('receive-transfer')
  @ApiOperation({ summary: 'Receive or reject an incoming transfer' })
  @ApiOkResponse({ type: Movement, isArray: true })
  @ApiBadRequestResponse({ description: 'Bad request' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Transfer group not found' })
  receiveTransfer(@Body() dto: ReceiveTransferDto) {
    return this.movementsService.receiveTransfer(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a movement by ID' })
  @ApiOkResponse({ type: Movement })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Movement not found' })
  findOne(@Param('id') id: string) {
    return this.movementsService.findOne(+id);
  }

  @Get()
  @ApiOperation({ summary: 'Find all movements with optional filters' })
  @ApiOkResponse({ type: Movement, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  findAll(@Query() query: FindMovementsQueryDto) {
    return this.movementsService.findAll(query);
  }
}

