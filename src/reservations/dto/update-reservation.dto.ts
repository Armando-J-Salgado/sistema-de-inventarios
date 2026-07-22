import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateReservationDto } from './create-reservation.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ReservationStatus } from '../enums/reservation-status.enum';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @ApiProperty({ enum: ReservationStatus, required: false, description: 'Status of the reservation' })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;
}
