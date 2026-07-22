// dto/issue-from-reservation.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt } from "class-validator";

export class IssueFromReservationDto {
  @ApiProperty({ example: 1, description: 'Employee performing the issue' })
  @Type(() => Number)
  @IsInt()
  employeeId: number;

  @ApiProperty({ example: 1, description: 'Reservation to issue against' })
  @Type(() => Number)
  @IsInt()
  reservationId: number;
}