import { Exclude, Expose } from "class-transformer";
import { EventAttendeeStatus } from "../enums/event-attendee-status.enum";

@Exclude()
export class AttendeeResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  userName?: string;

  @Expose()
  userProfileImage?: string;

  @Expose()
  status: EventAttendeeStatus;

  @Expose()
  joinedAt: Date;

  constructor(partial: Partial<AttendeeResponseDto>) {
    Object.assign(this, partial);
  }
}
