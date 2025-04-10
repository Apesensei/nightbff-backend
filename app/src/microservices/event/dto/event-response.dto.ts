import { Exclude, Expose, Type } from "class-transformer";
import { EventVisibility } from "../enums/event-visibility.enum";
import { AttendeeResponseDto } from "./attendee-response.dto";

@Exclude()
export class EventResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  creatorId: string;

  @Expose()
  creatorName?: string;

  @Expose()
  venueId?: string;

  @Expose()
  venueName?: string;

  @Expose()
  customLocation?: string;

  @Expose()
  startTime: Date;

  @Expose()
  endTime?: Date;

  @Expose()
  coverImage?: string;

  @Expose()
  attendeeLimit?: number;

  @Expose()
  visibility: EventVisibility;

  @Expose()
  requireApproval: boolean;

  @Expose()
  @Type(() => AttendeeResponseDto)
  attendees?: AttendeeResponseDto[];

  @Expose()
  attendeeCount?: number;

  @Expose()
  isAttending?: boolean;

  @Expose()
  distance?: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<EventResponseDto>) {
    Object.assign(this, partial);
  }
}
