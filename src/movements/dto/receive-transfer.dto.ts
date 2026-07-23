import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsUUID } from 'class-validator';
import { ReceiveDecision } from '../../enums/movement-type.enum';

export class ReceiveTransferDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'UUID of the transfer group to receive' })
  transferGroupId: number;

  @ApiProperty({ example: 2, description: 'ID of the employee receiving the transfer' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @ApiProperty({ enum: ReceiveDecision, description: 'Decision on the incoming transfer: ACCEPT or REJECT' })
  @IsEnum(ReceiveDecision)
  decision: ReceiveDecision;
}