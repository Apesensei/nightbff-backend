import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { EventAttendeeStatus } from "../enums/event-attendee-status.enum";

export class JoinEventDto {
  @IsEnum(EventAttendeeStatus)
  status: EventAttendeeStatus = EventAttendeeStatus.GOING;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}
