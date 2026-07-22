import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { CreateEntryMovementDto } from './dto/create-entry-movement.dto';
import { CreateExitMovementDto } from './dto/create-exit-movement.dto';
import { CreateTransferMovementDto } from './dto/create-transfer-movement.dto';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/jwt/roles/roles.decorator';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { RolesGuard } from 'src/jwt/roles/roles.guard';

@ApiTags('movements')
@ApiBearerAuth()
@Roles('ADMINISTRATOR', 'WAREHOUSE_MANAGER')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @ApiOperation({ summary: 'Register an entry movement' })
  @ApiResponse({ status: 201, description: 'Entry movement registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid argument exception. Missing fields' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Post('entry')
  createEntry(@Body() createEntryMovementDto: CreateEntryMovementDto) {
    return this.movementsService.createEntry(createEntryMovementDto);
  }

  @ApiOperation({ summary: 'Register an exit movement' })
  @ApiResponse({ status: 201, description: 'Exit movement registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid argument exception. Missing fields' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Post('exit')
  createExit(@Body() createExitMovementDto: CreateExitMovementDto) {
    return this.movementsService.createExit(createExitMovementDto);
  }

  @ApiOperation({ summary: 'Register a transfer movement' })
  @ApiResponse({ status: 201, description: 'Transfer movement registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid argument exception. Missing fields' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Post('transfer')
  createTransfer(@Body() createTransferMovementDto: CreateTransferMovementDto) {
    return this.movementsService.createTransfer(createTransferMovementDto);
  }

  @ApiOperation({ summary: 'Revert a movement' })
  @ApiParam({ name: 'id', type: Number, description: 'Movement ID' })
  @ApiResponse({ status: 200, description: 'Movement reverted successfully' })
  @ApiResponse({ status: 404, description: 'Movement not found' })
  @ApiResponse({ status: 401, description: 'Not authenthicated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @Post('revert/:id')
  revertMovement(@Param('id') id: string) {
    return this.movementsService.revertMovement(+id);
  }
}
